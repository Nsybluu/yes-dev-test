"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/admin/products/actions";

export function DeleteProductButton({ productId, label }: { productId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      try {
        await deleteProduct(productId);
        setOpen(false);
        toast.success("ลบสินค้าแล้ว");
      } catch {
        toast.error("ลบสินค้าไม่สำเร็จ กรุณาลองใหม่");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`ลบ ${label}`}>
            <Trash2 />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบสินค้านี้?</AlertDialogTitle>
          <AlertDialogDescription>
            {label} จะถูกลบถาวร พร้อมรูปและประวัติการสแกนของสินค้านี้ QR ที่พิมพ์ไปแล้วจะแสดงหน้า
            &quot;ไม่พบสินค้า&quot; หากต้องการเพียงซ่อนจากหน้าสาธารณะ ให้เปลี่ยนสถานะเป็นปิดใช้งานแทน
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "กำลังลบ..." : "ลบสินค้า"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
