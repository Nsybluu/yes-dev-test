import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/dal";
import { createProduct } from "@/app/admin/products/actions";
import { ProductForm } from "@/app/admin/products/product-form";

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="เพิ่มสินค้า" description="กรอกข้อมูลสินค้าใหม่ (* = จำเป็นต้องกรอก)" />
      <ProductForm action={createProduct} submitLabel="บันทึกสินค้า" />
    </>
  );
}
