// Regenerates the Excel files in sample-data/:  node scripts/make-sample-data.mjs
import ExcelJS from "exceljs";

const HEADER = ["sku", "name", "category", "price", "size", "description", "how_to_use", "status"];

async function write(file, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Products");
  ws.addRow(HEADER);
  rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c) => (c.width = 18));
  await wb.xlsx.writeFile(file);
}

// every row valid: imports straight away and shows the success popup
await write("sample-data/products-valid.xlsx", [
  ["LS-2001", "Gentle Foam Cleanser", "Cleanser", 390, "120 ml", "โฟมล้างหน้าอ่อนโยน", "นวดโฟมเบาๆ แล้วล้างออก", "active"],
  ["LS-2002", "Balancing Toner", "Toner", 450, "150 ml", "โทนเนอร์ปรับสมดุลผิว", "ใช้หลังล้างหน้า", "active"],
  ["LS-2003", "Hydra Glow Serum", "Serum", 1290.5, "30 ml", "เซรั่มเติมความชุ่มชื้น", "2-3 หยด เช้า-เย็น", "active"],
  ["LS-2004", "Daily Moisturizer", "Moisturizer", 790, "50 g", "", "", ""],
  ["LS-2005", "Sunscreen SPF50", "Sunscreen", 590, "40 ml", "กันแดดเนื้อบางเบา", "ทาก่อนออกแดด 15 นาที", "active"],
  ["LS-2006", "Clay Mask", "Mask", 520, "100 g", "", "", "inactive"],
]);

// run products-valid first, then this one: it shows every kind of problem
await write("sample-data/products-with-problems.xlsx", [
  ["LS-2101", "ผ่านปกติ", "Serum", 650, "30 ml", "", "", "active"], // ok, new
  ["ls-2102", "SKU พิมพ์เล็ก (ระบบแก้ให้)", "serum", "฿1,290", "", "", "", "Active"], // auto-fixed
  ["", "ไม่มี SKU", "Toner", 450, "", "", "", ""], // missing sku
  ["LS-2104", "ราคาเป็นข้อความ", "Mask", "ราคาพิเศษ", "", "", "", ""], // wrong type
  ["LS-2105", "ราคา 0", "", 0, "", "", "", ""], // out of range
  ["LS-2106", "status เป็น yes", "", 100, "", "", "", "yes"], // bad format
  [" ", " ", " ", " ", " ", " ", " ", " "], // blank row (skipped)
  ["LS-2107", "ซ้ำในไฟล์ A", "", 10, "", "", "", ""], // duplicate in file
  ["ls-2107", "ซ้ำในไฟล์ B", "", 20, "", "", "", ""], // duplicate in file
  ["LS-2001", "Gentle Foam Cleanser", "Cleanser", 420, "", "สูตรใหม่ ปรับปรุงเนื้อโฟม", "", ""], // exists: price + description differ
  ["LS-2002", "Balancing Toner", "Toner", 450, "", "", "", ""], // exists: nothing changed
  ["LS-2108", "หมวดหมู่ไม่รู้จัก", "Perfume", 99, "", "", "", ""], // bad category
]);
console.log("sample-data/*.xlsx written");
