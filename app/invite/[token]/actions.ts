"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { findPendingInvite } from "@/lib/auth/invite-lookup";
import { hashInviteToken, validatePassword } from "@/lib/auth/invites";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export type AcceptState = { error?: string } | undefined;

export async function acceptInvite(token: string, _state: AcceptState, formData: FormData): Promise<AcceptState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const invite = await findPendingInvite(token);
  if (!invite) return { error: "ลิงก์เชิญนี้ไม่ถูกต้อง ถูกใช้ไปแล้ว หรือหมดอายุ กรุณาติดต่อ Super Admin เพื่อขอลิงก์ใหม่" };

  const problem = validatePassword(password, confirm);
  if (problem) return { error: problem };

  // updateMany with the same conditions makes the link single-use even if it is
  // submitted twice at the same moment: only one request can match
  const { count } = await prisma.admin.updateMany({
    where: { adminId: invite.adminId, status: "INVITED", inviteTokenHash: hashInviteToken(token) },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      status: "ACTIVE",
      inviteTokenHash: null,
      inviteExpiresAt: null,
    },
  });
  if (count === 0) return { error: "ลิงก์เชิญนี้ถูกใช้ไปแล้ว" };

  await createSession(invite.adminId);
  redirect("/admin");
}
