"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite } from "@/app/invite/[token]/actions";

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInvite.bind(null, token), undefined);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">อีเมล</Label>
        <Input id="email" value={email} readOnly disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">ตั้งรหัสผ่าน</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <p className="text-muted-foreground text-xs">อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">ยืนยันรหัสผ่าน</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "ยืนยันและเข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
