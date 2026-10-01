"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

const MESSAGES = {
  created: "เพิ่มสินค้าแล้ว",
  updated: "บันทึกการแก้ไขแล้ว",
} as const;

// Server actions redirect here with ?saved=...; show the toast once, then drop the param
export function SavedToast({ saved }: { saved?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (saved && saved in MESSAGES) {
      toast.success(MESSAGES[saved as keyof typeof MESSAGES]);
      router.replace(pathname, { scroll: false });
    }
  }, [saved, pathname, router]);

  return null;
}
