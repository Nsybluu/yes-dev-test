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

// The invite link is shown to the Super Admin in the back office. This project does not
// really deliver email (lib/email.ts only writes it to the server log), so without the
// link on screen an invitation could only be read out of the log, in any mode.
// Once real email sending is wired up, set SHOW_INVITE_LINK="false" so that the link
// travels by email only. Only an explicit "false" hides it.
export function showInviteLink() {
  return (process.env.SHOW_INVITE_LINK ?? "").trim().toLowerCase() !== "false";
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
