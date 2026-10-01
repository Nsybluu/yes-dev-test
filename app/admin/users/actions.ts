"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/dal";
import { createInviteToken, isValidEmail, showInviteLink } from "@/lib/auth/invites";
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

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name) return { ok: false, error: "กรุณากรอกชื่อ" };
  if (name.length > 100) return { ok: false, error: "ชื่อยาวเกินไป (ไม่เกิน 100 ตัวอักษร)" };
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

export async function revokeInvite(adminId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await superAdmin())) return FORBIDDEN;
  // only pending invitations can be removed here, never an active account
  const { count } = await prisma.admin.deleteMany({ where: { adminId, status: "INVITED" } });
  revalidatePath("/admin/users");
  return count > 0 ? { ok: true } : { ok: false, error: "ไม่พบคำเชิญนี้ หรือผู้ใช้ยืนยันไปแล้ว" };
}
