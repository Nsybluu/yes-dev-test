import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSuperAdmin } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { InviteForm } from "@/app/admin/users/invite-form";
import { PendingActions } from "@/app/admin/users/pending-actions";

function isExpired(expiresAt: Date | null) {
  return !!expiresAt && expiresAt.getTime() < Date.now();
}

export default async function UsersPage() {
  const me = await requireSuperAdmin();
  const admins = await prisma.admin.findMany({
    orderBy: [{ adminRole: "asc" }, { createdAt: "asc" }],
    select: {
      adminId: true,
      adminName: true,
      email: true,
      adminRole: true,
      status: true,
      createdAt: true,
      inviteExpiresAt: true,
    },
  });

  return (
    <>
      <PageHeader title="จัดการผู้ใช้" description="เชิญผู้ดูแลระบบใหม่ทางอีเมล (เฉพาะ Super Admin)" />
      <InviteForm />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((a) => {
              const expired = a.status === "INVITED" && isExpired(a.inviteExpiresAt);
              return (
                <TableRow key={a.adminId}>
                  <TableCell className="font-medium">
                    {a.adminName}
                    {a.adminId === me.adminId && <span className="text-muted-foreground ml-2 text-xs">(คุณ)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.email}</TableCell>
                  <TableCell>
                    <Badge variant={a.adminRole === "SUPER_ADMIN" ? "default" : "secondary"}>
                      {a.adminRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.status === "ACTIVE" ? (
                      <Badge variant="secondary">ใช้งานอยู่</Badge>
                    ) : (
                      <div className="grid gap-0.5">
                        <Badge variant="outline">{expired ? "คำเชิญหมดอายุ" : "รอยืนยัน"}</Badge>
                        {a.inviteExpiresAt && !expired && (
                          <span className="text-muted-foreground text-xs">หมดอายุ {formatDateTime(a.inviteExpiresAt)}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.status === "INVITED" && <PendingActions adminId={a.adminId} name={a.adminName} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
