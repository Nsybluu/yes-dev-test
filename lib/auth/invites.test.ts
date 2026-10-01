import assert from "node:assert/strict";
import { test } from "node:test";
import { createInviteToken, hashInviteToken, isValidEmail, validatePassword } from "./invites";

test("tokens are unguessable, unique and only their hash is derivable", () => {
  const a = createInviteToken();
  const b = createInviteToken();
  assert.notEqual(a.token, b.token);
  assert.ok(a.token.length >= 43); // 32 random bytes
  assert.equal(a.hash, hashInviteToken(a.token));
  assert.notEqual(a.hash, a.token);
  assert.ok(a.expiresAt.getTime() > Date.now() + 47 * 3600 * 1000);
  assert.ok(a.expiresAt.getTime() < Date.now() + 49 * 3600 * 1000);
});

test("password rules", () => {
  assert.equal(validatePassword("abc123XY", "abc123XY"), null);
  assert.match(validatePassword("short1", "short1") ?? "", /อย่างน้อย 8/);
  assert.match(validatePassword("onlyletters", "onlyletters") ?? "", /ตัวอักษรและตัวเลข/);
  assert.match(validatePassword("12345678", "12345678") ?? "", /ตัวอักษรและตัวเลข/);
  assert.match(validatePassword("abc123XYZ", "abc123XYz") ?? "", /ไม่ตรงกัน/);
  assert.match(validatePassword("a1".repeat(40), "a1".repeat(40)) ?? "", /ยาวเกินไป/);
});

test("email check", () => {
  assert.equal(isValidEmail("a@b.co"), true);
  for (const bad of ["", "a", "a@b", "a b@c.com", "@b.com"]) assert.equal(isValidEmail(bad), false, bad);
});
