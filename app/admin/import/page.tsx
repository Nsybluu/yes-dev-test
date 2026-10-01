import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { ImportClient } from "@/app/admin/import/import-client";

export default async function ImportPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="นำเข้า Excel" description="นำเข้าหรืออัปเดตสินค้าจากไฟล์ Excel (.xlsx) ระบบจะตรวจสอบข้อมูลให้ก่อนนำเข้า" />
      <ImportClient />
    </>
  );
}
