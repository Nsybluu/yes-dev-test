"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/dal";
import { createInviteToken, isValidEmail, showInviteLink } from "@/lib/auth/invites";
import { checkDelete, planUserUpdate, validateName } from "@/lib/auth/user-rules";
import { inviteEmail, sendEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/qr";
import { prisma } from "@/lib/prisma";

export type InviteState =
  | { ok: true; email: string; link: string | null; resent: boolean }
  | { ok: false; error: string }
  | undefined;

// Everything here is Super Admin only, checked on the server for every call
async function superAdmin() {
  const admin = await getCurrentAdmin();
  return admin?.adminRole === "SUPER_ADMIN" ? admin : null;
}
const FORBIDDEN = { ok: false as const, error: "เฉพาะ Super Admin เท่านั้นที่จัดการผู้ใช้ได้" };

// Creates a fresh single-use token, logs the invitation "email", and returns the link
// for the back office to show (only when SHOW_INVITE_LINK allows it)
async function issueInvite(adminId: string, name: string, email: string, invitedBy: string) {
  const { token, hash, expiresAt } = createInviteToken();
  await prisma.admin.update({
    where: { adminId },
    data: { inviteTokenHash: hash, inviteExpiresAt: expiresAt },
  });
  const link = `${getBaseUrl()}/invite/${token}`;
  await sendEmail({ to: email, ...inviteEmail({ name, link, expiresAt, invitedBy }) });
  return showInviteLink() ? link : null;
}

export async function inviteAdmin(_state: InviteState, formData: FormData): Promise<InviteState> {
  const me = await superAdmin();
  if (!me) return FORBIDDEN;

  const nameCheck = validateName(String(formData.get("name") ?? ""));
  if (!nameCheck.ok) return nameCheck;
  const name = nameCheck.name;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) return { ok: false, error: "รูปแบบอีเมลไม่ถูกต้อง" };

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing && existing.status === "ACTIVE") {
    return { ok: false, error: "อีเมลนี้เป็นผู้ใช้อยู่แล้ว" };
  }

  // Inviting someone who is still pending just sends them a new link
  const admin =
    existing ??
    (await prisma.admin.create({
      data: { adminName: name, email, adminRole: "ADMIN", status: "INVITED" },
    }));
  if (existing) await prisma.admin.update({ where: { adminId: admin.adminId }, data: { adminName: name } });

  const link = await issueInvite(admin.adminId, name, email, me.adminName);
  revalidatePath("/admin/users");
  return { ok: true, email, link, resent: !!existing };
}

export async function resendInvite(adminId: string): Promise<InviteState> {
  const me = await superAdmin();
  if (!me) return FORBIDDEN;
  const target = await prisma.admin.findUnique({ where: { adminId } });
  if (!target || target.status !== "INVITED") {
    return { ok: false, error: "ไม่พบคำเชิญนี้ หรือผู้ใช้ยืนยันไปแล้ว" };
  }
  const link = await issueInvite(adminId, target.adminName, target.email, me.adminName);
  revalidatePath("/admin/users");
  return { ok: true, email: target.email, link, resent: true };
}

export type UserResult = { ok: true } | { ok: false; error: string };

async function activeSuperAdminCount() {
  return prisma.admin.count({ where: { adminRole: "SUPER_ADMIN", status: "ACTIVE" } });
}

// Any signed-in admin may call this, but what they may change comes from planUserUpdate:
// an Admin can only rename themselves; a Super Admin can also change email and role.
// The actor is read from the session, never from the form.
export async function updateUser(adminId: string, formData: FormData): Promise<UserResult> {
  const me = await getCurrentAdmin();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };

  const target = await prisma.admin.findUnique({
    where: { adminId },
    select: { adminId: true, email: true, adminRole: true, status: true },
  });
  if (!target) return { ok: false, error: "ไม่พบผู้ใช้นี้ อาจถูกลบไปแล้ว" };

  const emailField = formData.get("email");
  const roleField = formData.get("role");
  const plan = planUserUpdate(
    { adminId: me.adminId, role: me.adminRole },
    { adminId: target.adminId, email: target.email, role: target.adminRole, status: target.status },
    {
      name: String(formData.get("name") ?? ""),
      email: typeof emailField === "string" ? emailField : undefined,
      role: typeof roleField === "string" ? roleField : undefined,
    },
    await activeSuperAdminCount(),
  );
  if (!plan.ok) return plan;

  if (plan.data.email) {
    const clash = await prisma.admin.findUnique({ where: { email: plan.data.email } });
    if (clash && clash.adminId !== adminId) return { ok: false, error: "อีเมลนี้ถูกใช้โดยผู้ใช้อื่นแล้ว" };
  }

  try {
    await prisma.admin.update({ where: { adminId }, data: plan.data });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, error: "อีเมลนี้ถูกใช้โดยผู้ใช้อื่นแล้ว" };
    throw e;
  }
  // the sidebar shows the signed-in user's name, so refresh the whole admin layout
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Super Admin only. Removing the row also ends that person's session at once, because
// every request re-checks the account in the database (lib/dal.ts).
export async function deleteUser(adminId: string): Promise<UserResult> {
  const me = await superAdmin();
  if (!me) return FORBIDDEN;

  const target = await prisma.admin.findUnique({
    where: { adminId },
    select: { adminId: true, email: true, adminRole: true, status: true },
  });
  if (!target) return { ok: true }; // already gone

  const reason = checkDelete(
    { adminId: me.adminId, role: me.adminRole },
    { adminId: target.adminId, email: target.email, role: target.adminRole, status: target.status },
    await activeSuperAdminCount(),
  );
  if (reason) return { ok: false, error: reason };

  await prisma.admin.deleteMany({ where: { adminId } });
  revalidatePath("/admin/users");
  return { ok: true };
}
