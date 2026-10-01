import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDelete, planUserUpdate, validateName, type Actor, type Target } from "./user-rules";

const superAdmin: Actor = { adminId: "sa1", role: "SUPER_ADMIN" };
const admin: Actor = { adminId: "ad1", role: "ADMIN" };
const adminTarget: Target = { adminId: "ad1", email: "ad1@example.test", role: "ADMIN", status: "ACTIVE" };
const otherAdmin: Target = { adminId: "ad2", email: "ad2@example.test", role: "ADMIN", status: "ACTIVE" };
const selfSuper: Target = { adminId: "sa1", email: "sa1@example.test", role: "SUPER_ADMIN", status: "ACTIVE" };

test("name validation", () => {
  assert.deepEqual(validateName("  สมชาย  "), { ok: true, name: "สมชาย" });
  assert.equal(validateName("   ").ok, false);
  assert.equal(validateName("x".repeat(101)).ok, false);
});

test("an Admin may only change their own name, nothing else", () => {
  const plan = planUserUpdate(admin, adminTarget, { name: "New Name", email: "hacker@example.test", role: "SUPER_ADMIN" }, 1);
  assert.deepEqual(plan, { ok: true, data: { adminName: "New Name" } }); // email/role in the request are ignored
});

test("an Admin cannot edit someone else", () => {
  assert.equal(planUserUpdate(admin, otherAdmin, { name: "x" }, 1).ok, false);
  assert.equal(planUserUpdate(admin, selfSuper, { name: "x" }, 1).ok, false);
});

test("a Super Admin can change name, email and role of another user", () => {
  const plan = planUserUpdate(superAdmin, otherAdmin, { name: "Renamed", email: " NEW@Example.test ", role: "SUPER_ADMIN" }, 1);
  assert.deepEqual(plan, { ok: true, data: { adminName: "Renamed", email: "new@example.test", adminRole: "SUPER_ADMIN" } });
});

test("unchanged email and role are not written again", () => {
  const plan = planUserUpdate(superAdmin, otherAdmin, { name: "Same", email: otherAdmin.email, role: "ADMIN" }, 1);
  assert.deepEqual(plan, { ok: true, data: { adminName: "Same" } });
});

test("a Super Admin cannot change their own role (no lock-out) but can rename themselves", () => {
  assert.equal(planUserUpdate(superAdmin, selfSuper, { name: "Me", role: "ADMIN" }, 2).ok, false);
  assert.deepEqual(planUserUpdate(superAdmin, selfSuper, { name: "Me", role: "SUPER_ADMIN" }, 2), {
    ok: true,
    data: { adminName: "Me" },
  });
});

test("the last Super Admin cannot be demoted", () => {
  const lastSuper: Target = { adminId: "sa2", email: "sa2@example.test", role: "SUPER_ADMIN", status: "ACTIVE" };
  assert.equal(planUserUpdate(superAdmin, lastSuper, { name: "x", role: "ADMIN" }, 1).ok, false);
  assert.equal(planUserUpdate(superAdmin, lastSuper, { name: "x", role: "ADMIN" }, 2).ok, true);
});

test("bad email, bad role and editing a pending invite's email are rejected", () => {
  assert.equal(planUserUpdate(superAdmin, otherAdmin, { name: "x", email: "not-an-email" }, 1).ok, false);
  assert.equal(planUserUpdate(superAdmin, otherAdmin, { name: "x", role: "OWNER" }, 1).ok, false);
  const pending: Target = { ...otherAdmin, status: "INVITED" };
  assert.equal(planUserUpdate(superAdmin, pending, { name: "x", email: "other@example.test" }, 1).ok, false);
  assert.equal(planUserUpdate(superAdmin, pending, { name: "x", email: pending.email }, 1).ok, true);
});

test("delete rules", () => {
  assert.equal(checkDelete(superAdmin, otherAdmin, 1), null);
  assert.match(checkDelete(admin, otherAdmin, 1) ?? "", /Super Admin/);
  assert.match(checkDelete(superAdmin, selfSuper, 2) ?? "", /ตัวเอง/);
  const lastSuper: Target = { adminId: "sa2", email: "sa2@example.test", role: "SUPER_ADMIN", status: "ACTIVE" };
  assert.match(checkDelete(superAdmin, lastSuper, 1) ?? "", /อย่างน้อย 1/);
  assert.equal(checkDelete(superAdmin, lastSuper, 2), null);
});
