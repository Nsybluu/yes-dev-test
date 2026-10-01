import type { Metadata } from "next";
import { LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptForm } from "@/app/invite/[token]/accept-form";
import { findPendingInvite } from "@/lib/auth/invite-lookup";

export const metadata: Metadata = { title: "ยืนยันคำเชิญ", robots: { index: false } };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invite = await findPendingInvite(token);

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        {invite ? (
          <>
            <CardHeader>
              <CardTitle>ยินดีต้อนรับ คุณ{invite.adminName}</CardTitle>
              <CardDescription>ตั้งรหัสผ่านของคุณเอง เพื่อเริ่มใช้งานระบบหลังบ้าน</CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptForm token={token} email={invite.email} />
            </CardContent>
          </>
        ) : (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="size-4" /> ลิงก์เชิญใช้ไม่ได้
            </CardTitle>
            <CardDescription>
              ลิงก์นี้ไม่ถูกต้อง ถูกใช้ไปแล้ว หรือหมดอายุ กรุณาติดต่อ Super Admin เพื่อขอลิงก์เชิญใหม่
            </CardDescription>
          </CardHeader>
        )}
      </Card>
    </main>
  );
}
