"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InviteResult } from "@/app/admin/users/invite-form";
import { resendInvite, revokeInvite, type InviteState } from "@/app/admin/users/actions";

// Row actions for a pending invitation: send a new link, or cancel the invitation
export function PendingActions({ adminId, name }: { adminId: string; name: string }) {
  const [result, setResult] = useState<InviteState>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await resendInvite(adminId);
              if (!r?.ok) toast.error(r?.error ?? "ส่งลิงก์ไม่สำเร็จ");
              setResult(r);
            })
          }
        >
          <RefreshCw />
          ส่งลิงก์ใหม่
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`ยกเลิกคำเชิญ ${name}`}
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`ยกเลิกคำเชิญของ ${name}?`)) return;
            startTransition(async () => {
              const r = await revokeInvite(adminId);
              if (r.ok) toast.success("ยกเลิกคำเชิญแล้ว");
              else toast.error(r.error ?? "ยกเลิกไม่สำเร็จ");
            });
          }}
        >
          <Trash2 />
        </Button>
      </div>
      {result?.ok && (
        <div className="w-full max-w-md text-left">
          <InviteResult email={result.email} link={result.link} resent />
        </div>
      )}
    </div>
  );
}
