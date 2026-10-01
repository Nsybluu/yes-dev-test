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
import { requireAdmin } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { InviteForm } from "@/app/admin/users/invite-form";
import { UserRowActions } from "@/app/admin/users/user-actions";

function isExpired(expiresAt: Date | null) {
  return !!expiresAt && expiresAt.getTime() < Date.now();
}

export default async function UsersPage() {
  const me = await requireAdmin();
  const isSuper = me.adminRole === "SUPER_ADMIN";
  const admins = await prisma.admin.findMany({
    orderBy: [{ adminRole: "asc" }, { createdAt: "asc" }],
    select: {
      adminId: true,
      adminName: true,
      email: true,
      adminRole: true,
      status: true,
      inviteExpiresAt: true,
    },
  });
  const viewer = { adminId: me.adminId, role: me.adminRole };

  return (
    <>
      <PageHeader
        title={isSuper ? "จัดการผู้ใช้" : "ผู้ใช้"}
        description={
          isSuper
            ? "เชิญ แก้ไข และลบผู้ดูแลระบบ (เฉพาะ Super Admin)"
            : "คุณแก้ไขได้เฉพาะชื่อของตัวเอง ส่วนการเชิญ แก้ไขผู้อื่น และลบ ทำได้เฉพาะ Super Admin"
        }
      />
      {isSuper && <InviteForm />}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              {isSuper && <TableHead>อีเมล</TableHead>}
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
                  {isSuper && <TableCell className="text-muted-foreground">{a.email}</TableCell>}
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
                        {isSuper && a.inviteExpiresAt && !expired && (
                          <span className="text-muted-foreground text-xs">หมดอายุ {formatDateTime(a.inviteExpiresAt)}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRowActions
                      viewer={viewer}
                      user={{
                        adminId: a.adminId,
                        name: a.adminName,
                        // an Admin never receives other people's emails; the row's own email isn't needed to rename
                        email: isSuper || a.adminId === me.adminId ? a.email : "",
                        role: a.adminRole,
                        status: a.status,
                      }}
                    />
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
