import { PageHeader } from "@/components/admin/page-header";
import { requireSuperAdmin } from "@/lib/dal";

export default async function UsersPage() {
  await requireSuperAdmin();
  return <PageHeader title="จัดการผู้ใช้" description="เชิญและจัดการผู้ดูแลระบบ" />;
}
