"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLEAR_PHRASE, type ClearCounts } from "@/lib/products/clear";
import { clearAllProducts } from "@/app/admin/products/actions";

type Step = 1 | 2 | 3;

export function ClearAllProducts({ counts }: { counts: ClearCounts }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep(1);
    setAcknowledged(false);
    setPhrase("");
    setPassword("");
    setError(null);
  }

  function onOpenChange(next: boolean) {
    if (pending) return; // don't allow closing mid-delete
    setOpen(next);
    if (!next) reset();
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await clearAllProducts(phrase, password);
      if (!result.ok) {
        setError(result.error);
        setPassword("");
        return;
      }
      setOpen(false);
      reset();
      toast.success(`ล้างสินค้าทั้งหมดแล้ว (${result.deleted.toLocaleString("th-TH")} รายการ)`);
    });
  }

  const phraseOk = phrase.trim() === CLEAR_PHRASE;

  return (
    <section className="border-destructive/40 grid gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-destructive flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" />
            พื้นที่อันตราย
          </h2>
          <p className="text-muted-foreground text-sm">
            ลบสินค้าทั้งหมดออกจากระบบถาวร (เห็นเฉพาะ Super Admin)
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          disabled={counts.products === 0}
        >
          <Trash2 />
          ล้างสินค้าทั้งหมด
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <p className="text-muted-foreground text-xs">ขั้นที่ {step} จาก 3</p>
            <AlertDialogTitle>
              {step === 1 && "ล้างสินค้าทั้งหมด?"}
              {step === 2 && "พิมพ์ข้อความเพื่อยืนยัน"}
              {step === 3 && "ยืนยันด้วยรหัสผ่านของคุณ"}
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              {step === 1 && (
                <div className="grid gap-3 text-left">
                  <p>สิ่งต่อไปนี้จะถูกลบถาวรและ <strong>กู้คืนไม่ได้</strong>:</p>
                  <ul className="list-disc pl-5">
                    <li>สินค้า {counts.products.toLocaleString("th-TH")} รายการ</li>
                    <li>รูปสินค้า {counts.images.toLocaleString("th-TH")} รูป</li>
                    <li>ประวัติการสแกน {counts.scans.toLocaleString("th-TH")} ครั้ง</li>
                  </ul>
                  <p>
                    QR ที่พิมพ์ไปแล้วทุกอันจะแสดงหน้า &quot;ไม่พบสินค้า&quot; แม้นำเข้าสินค้าเดิมกลับมาใหม่
                    (QR จะผูกกับสินค้าใหม่ไม่ได้) บัญชีผู้ดูแลระบบจะไม่ถูกลบ
                  </p>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 size-4"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                    />
                    <span>ฉันเข้าใจว่าการลบนี้ถาวรและกู้คืนไม่ได้</span>
                  </label>
                </div>
              )}
              {step === 2 && (
                <div className="grid gap-3 text-left">
                  <p>
                    พิมพ์ข้อความ <strong className="text-foreground">{CLEAR_PHRASE}</strong> ให้ตรงทุกตัวอักษร
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor="clear-phrase">ข้อความยืนยัน</Label>
                    <Input
                      id="clear-phrase"
                      value={phrase}
                      onChange={(e) => setPhrase(e.target.value)}
                      autoComplete="off"
                      placeholder={CLEAR_PHRASE}
                    />
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="grid gap-3 text-left">
                  <p>ขั้นตอนสุดท้าย กรอกรหัสผ่านที่ใช้เข้าสู่ระบบเพื่อยืนยันว่าเป็นคุณจริง</p>
                  <div className="grid gap-2">
                    <Label htmlFor="clear-password">รหัสผ่าน</Label>
                    <Input
                      id="clear-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={pending}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-destructive text-sm">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>ยกเลิก</AlertDialogCancel>
            {step === 1 && (
              <Button onClick={() => setStep(2)} disabled={!acknowledged}>
                ถัดไป
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => setStep(3)} disabled={!phraseOk}>
                ถัดไป
              </Button>
            )}
            {step === 3 && (
              <Button variant="destructive" onClick={submit} disabled={!password || pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                {pending ? "กำลังลบ..." : "ลบสินค้าทั้งหมดถาวร"}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
