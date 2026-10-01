"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string; email?: string } | undefined;

const INVALID = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";

// Compared against when the account doesn't exist, so response time doesn't
// reveal whether an email is registered.
let dummyHash: string | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน", email };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });

  dummyHash ??= await bcrypt.hash("dummy-password", 12);
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? dummyHash);

  // invited admins have no password yet and can't log in until they set one
  if (!admin || !admin.passwordHash || !valid || admin.status !== "ACTIVE") {
    return { error: INVALID, email };
  }

  await createSession(admin.adminId);
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
