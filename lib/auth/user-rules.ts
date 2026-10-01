import { isValidEmail } from "@/lib/auth/invites";

// Who may change what about a user. Pure functions: the server actions call these with
// facts read from the database (never from the browser), and they are unit-tested.

export type Role = "SUPER_ADMIN" | "ADMIN";
export type Actor = { adminId: string; role: Role };
export type Target = { adminId: string; email: string; role: Role; status: "ACTIVE" | "INVITED" };
export type UpdateInput = { name: string; email?: string; role?: string };

export type UpdatePlan =
  | { ok: true; data: { adminName: string; email?: string; adminRole?: Role } }
  | { ok: false; error: string };

export const MAX_NAME_LENGTH = 100;

export function validateName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim();
  if (!name) return { ok: false, error: "กรุณากรอกชื่อ" };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, error: `ชื่อยาวเกินไป (ไม่เกิน ${MAX_NAME_LENGTH} ตัวอักษร)` };
  return { ok: true, name };
}

// superAdminCount = number of ACTIVE Super Admins right now
export function planUserUpdate(actor: Actor, target: Target, input: UpdateInput, superAdminCount: number): UpdatePlan {
  const name = validateName(input.name);
  if (!name.ok) return name;
  const self = actor.adminId === target.adminId;

  // An Admin can change one thing: their own name. Anything else in the request is ignored.
  if (actor.role !== "SUPER_ADMIN") {
    if (!self) return { ok: false, error: "คุณแก้ไขได้เฉพาะชื่อของตัวเองเท่านั้น" };
    return { ok: true, data: { adminName: name.name } };
  }

  const data: { adminName: string; email?: string; adminRole?: Role } = { adminName: name.name };

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (email !== target.email) {
      if (!isValidEmail(email)) return { ok: false, error: "รูปแบบอีเมลไม่ถูกต้อง" };
      if (target.status === "INVITED") {
        return { ok: false, error: "แก้อีเมลของคำเชิญที่ยังไม่ยืนยันไม่ได้ ให้ลบคำเชิญแล้วเชิญใหม่" };
      }
      data.email = email;
    }
  }

  if (input.role !== undefined && input.role !== target.role) {
    if (input.role !== "ADMIN" && input.role !== "SUPER_ADMIN") return { ok: false, error: "บทบาทไม่ถูกต้อง" };
    if (self) return { ok: false, error: "เปลี่ยนบทบาทของตัวเองไม่ได้ (กันตัวเองหลุดสิทธิ์)" };
    if (target.role === "SUPER_ADMIN" && input.role === "ADMIN" && superAdminCount <= 1) {
      return { ok: false, error: "ต้องมี Super Admin อย่างน้อย 1 คน" };
    }
    data.adminRole = input.role;
  }

  return { ok: true, data };
}

// null = allowed, otherwise the reason it is not
export function checkDelete(actor: Actor, target: Target, superAdminCount: number): string | null {
  if (actor.role !== "SUPER_ADMIN") return "เฉพาะ Super Admin เท่านั้นที่ลบผู้ใช้ได้";
  if (actor.adminId === target.adminId) return "ลบบัญชีของตัวเองไม่ได้";
  if (target.role === "SUPER_ADMIN" && target.status === "ACTIVE" && superAdminCount <= 1) {
    return "ต้องมี Super Admin อย่างน้อย 1 คน";
  }
  return null;
}
