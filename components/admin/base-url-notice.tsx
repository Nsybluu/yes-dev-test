import { getBaseUrlInfo } from "@/lib/qr";

// Explains, next to the QR codes, anything about APP_URL that would make them fail
export function BaseUrlNotice({ compact = false }: { compact?: boolean }) {
  const info = getBaseUrlInfo();
  const messages: string[] = [];

  if (info.invalid) {
    messages.push(
      `ค่า APP_URL ใน .env ใช้ไม่ได้ ("${info.raw}") ระบบใช้ ${info.url} แทนชั่วคราว ให้แก้เป็นรูปแบบ http://ที่อยู่:พอร์ต หรือ https://โดเมน`,
    );
  } else if (info.addedScheme) {
    messages.push(
      `APP_URL ใน .env ("${info.raw}") ไม่มี http:// หรือ https:// นำหน้า ระบบเติมให้เป็น ${info.url} แล้ว แต่ควรแก้ใน .env ให้ถูกต้อง และ QR ที่ดาวน์โหลดไว้ก่อนหน้า (ยังเป็นข้อความที่ไม่ใช่ลิงก์) ต้องดาวน์โหลดใหม่`,
    );
  }

  if (info.kind === "localhost") {
    messages.push(
      `QR ชี้ไปที่ ${info.url} ซึ่งเปิดได้เฉพาะในเครื่องนี้ มือถือสแกนแล้วเปิดไม่ได้ ห้ามพิมพ์ไปติดสินค้า ตั้งค่า APP_URL เป็นที่อยู่ที่มือถือเข้าถึงได้ก่อน`,
    );
  } else if (info.kind === "lan") {
    messages.push(
      `QR ชี้ไปที่ ${info.url} ซึ่งเป็นที่อยู่ในวงเครือข่ายภายใน เปิดได้เฉพาะอุปกรณ์ที่ต่อ Wi-Fi/เครือข่ายเดียวกับเครื่องนี้ และต้องเปิดเซิร์ฟเวอร์ค้างไว้ ใช้ทดสอบได้ แต่ห้ามพิมพ์ไปติดสินค้าจริง`,
    );
  }

  if (messages.length === 0) return null;
  return (
    <div className={compact ? "grid gap-1" : "grid gap-2"} role="note">
      {messages.map((m) => (
        <p
          key={m}
          className={
            compact
              ? "rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs"
              : "rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
          }
        >
          {m}
        </p>
      ))}
    </div>
  );
}
