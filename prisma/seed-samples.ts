// Dev-only sample products for trying the public page. SKUs are LS-99xx so
// they won't collide with a real import. Remove with: npm run db:seed:samples -- --clean
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const img = (file: string) => ({
  imageName: file,
  imagePath: `/uploads/samples/${file}`,
});

const samples = [
  {
    sku: "LS-9901",
    name: "Gentle Foam Cleanser",
    category: "Cleanser",
    price: 390,
    size: "120 ml",
    description:
      "โฟมล้างหน้าเนื้อนุ่ม ทำความสะอาดอย่างอ่อนโยน ไม่ทำให้ผิวแห้งตึงหลังล้าง\nเหมาะกับทุกสภาพผิว รวมถึงผิวแพ้ง่าย",
    howToUse: "1. ล้างหน้าให้เปียก\n2. นวดโฟมเบาๆ ประมาณ 30 วินาที\n3. ล้างออกด้วยน้ำสะอาด",
    images: [img("a.png")],
  },
  {
    sku: "LS-9902",
    name: "Hydra Glow Serum",
    category: "Serum",
    price: 1290.5,
    size: "30 ml",
    description: "เซรั่มบำรุงผิวเติมความชุ่มชื้น ผิวดูกระจ่างใสและเรียบเนียนขึ้น",
    howToUse: "ใช้หลังล้างหน้าและโทนเนอร์ ปริมาณ 2-3 หยด ทั้งเช้าและเย็น",
    images: [img("a.png"), img("b.png"), img("c.png")],
  },
  // only the required fields, no image
  { sku: "LS-9903", name: "Daily Sunscreen SPF50", price: 590 },
  // inactive: must not appear on the public page
  {
    sku: "LS-9904",
    name: "Retired Toner",
    category: "Toner",
    price: 450,
    status: "INACTIVE" as const,
  },
  // long text, to check wrapping and readability
  {
    sku: "LS-9905",
    name: "Overnight Repair Moisturizer Intensive Barrier Cream สูตรเข้มข้นสำหรับกลางคืน",
    category: "Moisturizer",
    price: 1890,
    size: "50 g",
    description:
      "มอยส์เจอไรเซอร์สูตรเข้มข้นสำหรับใช้ก่อนนอน ช่วยฟื้นบำรุงปราการผิวระหว่างที่หลับ " +
      "ตื่นเช้ามาผิวนุ่มชุ่มชื้น ไม่เหนียวเหนอะหนะ ซึมซาบเร็ว ".repeat(3),
    howToUse: "ทาบางๆ ให้ทั่วใบหน้าและลำคอเป็นขั้นตอนสุดท้ายของการบำรุงตอนกลางคืน",
    images: [img("b.png")],
  },
];

async function main() {
  if (process.argv.includes("--clean")) {
    const { count } = await prisma.product.deleteMany({
      where: { sku: { in: samples.map((s) => s.sku) } },
    });
    console.log(`Removed ${count} sample products`);
    return;
  }

  for (const { images, ...data } of samples) {
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
      console.log(`${data.sku} exists, skipping`);
      continue;
    }
    const product = await prisma.product.create({
      data: {
        ...data,
        images: images
          ? { create: images.map((image, sortOrder) => ({ ...image, sortOrder })) }
          : undefined,
      },
    });
    console.log(`${data.sku} -> /p/${product.productId}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
