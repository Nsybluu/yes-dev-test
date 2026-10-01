"use client";

import { useState, useTransition } from "react";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InviteResult } from "@/app/admin/users/invite-form";
import { deleteUser, resendInvite, updateUser, type InviteState } from "@/app/admin/users/actions";

export type UserRow = {
  adminId: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "INVITED";
};
export type Viewer = { adminId: string; role: "SUPER_ADMIN" | "ADMIN" };

const roleItems = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

// What the buttons show is only a convenience: the server decides again on every call.
export function UserRowActions({ user, viewer }: { user: UserRow; viewer: Viewer }) {
  const isSuper = viewer.role === "SUPER_ADMIN";
  const isSelf = viewer.adminId === user.adminId;
  const canEdit = isSuper || isSelf;
  const canDelete = isSuper && !isSelf;
  const canResend = isSuper && user.status === "INVITED";

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteState>();
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateUser(user.adminId, formData);
      if (!result.ok) return setError(result.error);
      setEditing(false);
      toast.success("บันทึกการแก้ไขแล้ว");
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteUser(user.adminId);
      setDeleting(false);
      if (result.ok) toast.success(`ลบผู้ใช้ ${user.name} แล้ว`);
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex gap-1">
        {canResend && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await resendInvite(user.adminId);
                if (!r?.ok) toast.error(r?.error ?? "ส่งลิงก์ไม่สำเร็จ");
                setInvite(r);
              })
            }
          >
            <RefreshCw />
            ส่งลิงก์ใหม่
          </Button>
        )}
        {canEdit && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`แก้ไข ${user.name}`}
            title={isSuper ? "แก้ไขผู้ใช้" : "แก้ไขชื่อของคุณ"}
            onClick={() => {
              setError(null);
              setEditing(true);
            }}
          >
            <Pencil />
          </Button>
        )}
        {canDelete && (
          <Button size="icon-sm" variant="ghost" aria-label={`ลบ ${user.name}`} title="ลบผู้ใช้" onClick={() => setDeleting(true)}>
            <Trash2 />
          </Button>
        )}
      </div>

      {invite?.ok && (
        <div className="w-full max-w-md text-left">
          <InviteResult email={invite.email} link={invite.link} resent />
        </div>
      )}

      {/* edit */}
      <Dialog open={editing} onOpenChange={(open) => !pending && setEditing(open)}>
        <DialogContent>
          <form action={save} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{isSuper ? "แก้ไขผู้ใช้" : "แก้ไขชื่อของคุณ"}</DialogTitle>
              <DialogDescription>
                {isSuper ? user.email : "คุณแก้ไขได้เฉพาะชื่อ ส่วนอีเมลและบทบาทเปลี่ยนโดย Super Admin"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor={`name-${user.adminId}`}>ชื่อ</Label>
              <Input id={`name-${user.adminId}`} name="name" defaultValue={user.name} required maxLength={100} autoComplete="off" />
            </div>

            {isSuper && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={`email-${user.adminId}`}>อีเมล</Label>
                  <Input
                    id={`email-${user.adminId}`}
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    required
                    disabled={user.status === "INVITED"}
                    autoComplete="off"
                  />
                  {user.status === "INVITED" && (
                    <p className="text-muted-foreground text-xs">คำเชิญที่ยังไม่ยืนยันแก้อีเมลไม่ได้ ให้ลบแล้วเชิญใหม่</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`role-${user.adminId}`}>บทบาท</Label>
                  <Select name="role" items={roleItems} defaultValue={user.role} disabled={isSelf}>
                    <SelectTrigger id={`role-${user.adminId}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleItems.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSelf && <p className="text-muted-foreground text-xs">เปลี่ยนบทบาทของตัวเองไม่ได้ (กันตัวเองหลุดสิทธิ์)</p>}
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* delete */}
      <AlertDialog open={deleting} onOpenChange={(open) => !pending && setDeleting(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบผู้ใช้นี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {user.name} ({user.email}) จะถูกลบถาวร และเข้าสู่ระบบไม่ได้ทันที
              {user.status === "INVITED" ? " ลิงก์เชิญที่ส่งไปจะใช้ไม่ได้อีก" : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>ยกเลิก</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? "กำลังลบ..." : "ลบผู้ใช้"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
