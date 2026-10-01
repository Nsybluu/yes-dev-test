import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_HOURS = 48;

// Only the hash of a token is stored, so a copy of the database can't be used to accept invites
export function createInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000) };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Showing the invite link in the back office is a dev/demo convenience. In production
// the link should only reach the invitee by email, so it defaults to off there.
export function showInviteLink() {
  const flag = process.env.SHOW_INVITE_LINK;
  return flag ? flag === "true" : process.env.NODE_ENV !== "production";
}

export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
  if (password.length > 72) return "รหัสผ่านยาวเกินไป (ไม่เกิน 72 ตัวอักษร)"; // bcrypt ignores everything after 72 bytes
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข";
  if (password !== confirm) return "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
  return null;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
