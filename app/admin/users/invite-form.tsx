"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteAdmin } from "@/app/admin/users/actions";

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          toast.success("คัดลอกลิงก์เชิญแล้ว");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("คัดลอกไม่สำเร็จ ให้เลือกลิงก์แล้วคัดลอกเอง");
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์เชิญ"}
    </Button>
  );
}

export function InviteResult({ email, link, resent }: { email: string; link: string | null; resent: boolean }) {
  return (
    <div className="grid gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm" role="status">
      <p className="font-medium">
        {resent ? "ส่งลิงก์เชิญใหม่แล้ว" : "ส่งคำเชิญแล้ว"} ถึง {email}
      </p>
      <p className="text-muted-foreground">
        ระบบบันทึกอีเมลลง log ของเซิร์ฟเวอร์ (ยังไม่ได้ส่งจริง) ลิงก์ใช้ได้ครั้งเดียวและหมดอายุใน 48 ชั่วโมง
      </p>
      {link ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-background min-w-0 flex-1 truncate rounded px-2 py-1 text-xs">{link}</code>
          <CopyLinkButton link={link} />
        </div>
      ) : (
        <p className="text-muted-foreground">ลิงก์ถูกซ่อนในหน้านี้ (SHOW_INVITE_LINK=false) ดูได้จาก log ของเซิร์ฟเวอร์</p>
      )}
    </div>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteAdmin, undefined);
  return (
    <section className="grid max-w-xl gap-4 rounded-lg border p-4">
      <div>
        <h2 className="flex items-center gap-2 font-medium">
          <Mail className="size-4" /> เชิญผู้ดูแลระบบใหม่
        </h2>
        <p className="text-muted-foreground text-sm">
          ผู้ถูกเชิญจะได้ลิงก์ทางอีเมลเพื่อยืนยันและตั้งรหัสผ่านเอง (บทบาท Admin)
        </p>
      </div>
      <form action={action} className="grid gap-3 sm:grid-cols-2" key={state?.ok ? state.email + state.link : "form"}>
        <div className="grid content-start gap-2">
          <Label htmlFor="invite-name">ชื่อ</Label>
          <Input id="invite-name" name="name" required maxLength={100} autoComplete="off" />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="invite-email">อีเมล</Label>
          <Input id="invite-email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            <Mail />
            {pending ? "กำลังส่ง..." : "ส่งคำเชิญ"}
          </Button>
        </div>
      </form>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.ok && <InviteResult email={state.email} link={state.link} resent={state.resent} />}
    </section>
  );
}
