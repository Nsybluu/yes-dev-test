"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type FieldKey } from "@/lib/products/validation";
import type { ProductFormState } from "@/app/admin/products/actions";

type Action = (
  state: ProductFormState,
  formData: FormData,
) => Promise<ProductFormState>;

export type ProductFormValues = Partial<Record<FieldKey, string>>;

const categoryItems = [
  { value: "none", label: "ไม่ระบุ" },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];
const statusItems = [
  { value: "active", label: "เปิดใช้งาน (active)" },
  { value: "inactive", label: "ปิดใช้งาน (inactive)" },
];

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    // content-start: when a neighbour in the same row is taller (it has a hint),
    // this box is stretched, and without it the label/control rows drift apart
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function ProductForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: ProductFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // after a failed submit React clears the form, so refill from what the server echoed back
  const v: ProductFormValues = state?.values ?? initial ?? {};
  const e = state?.errors ?? {};
  // remount on each server response so defaultValue picks up the echoed values
  const formKey = state ? JSON.stringify(state.values) : "initial";

  return (
    <form key={formKey} action={formAction} className="grid max-w-2xl gap-5">
      {state?.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="sku" label="SKU *" hint="รูปแบบ LS-0000" error={e.sku}>
          <Input
            id="sku"
            name="sku"
            defaultValue={v.sku}
            placeholder="LS-0001"
            aria-invalid={!!e.sku}
          />
        </Field>
        <Field id="price" label="ราคา (บาท) *" error={e.price}>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={v.price}
            placeholder="390"
            aria-invalid={!!e.price}
          />
        </Field>
      </div>

      <Field id="name" label="ชื่อสินค้า *" error={e.name}>
        <Input
          id="name"
          name="name"
          defaultValue={v.name}
          aria-invalid={!!e.name}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="category" label="หมวดหมู่" error={e.category}>
          <Select
            name="category"
            items={categoryItems}
            defaultValue={v.category || "none"}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="size" label="ขนาด" hint="เช่น 30 ml, 50 g" error={e.size}>
          <Input id="size" name="size" defaultValue={v.size} />
        </Field>
        <Field
          id="status"
          label="สถานะ"
          hint="ปิดใช้งาน = ไม่แสดงหน้าสาธารณะ"
          error={e.status}
        >
          <Select
            name="status"
            items={statusItems}
            defaultValue={v.status?.toLowerCase() || "active"}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusItems.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field id="description" label="รายละเอียด" error={e.description}>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={v.description}
        />
      </Field>
      <Field id="howToUse" label="วิธีใช้" error={e.howToUse}>
        <Textarea
          id="howToUse"
          name="howToUse"
          rows={4}
          defaultValue={v.howToUse}
        />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก..." : submitLabel}
        </Button>
        <Button variant="outline" render={<Link href="/admin/products" />}>
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
