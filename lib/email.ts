// Outgoing email. For this project mail is not really sent: it is written to the
// server log, which the brief allows ("save the email to a log instead of sending").
// To send for real, replace the body of sendEmail with an SMTP / Mailtrap call
// (e.g. nodemailer); nothing else needs to change.

export type Email = { to: string; subject: string; text: string };

export async function sendEmail(email: Email) {
  console.log(
    [
      "",
      "================ EMAIL (logged, not sent) ================",
      `To:      ${email.to}`,
      `Subject: ${email.subject}`,
      "",
      email.text,
      "==========================================================",
      "",
    ].join("\n"),
  );
}

export function inviteEmail(opts: { name: string; link: string; expiresAt: Date; invitedBy: string }): Omit<Email, "to"> {
  const until = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(opts.expiresAt);
  return {
    subject: "คำเชิญเข้าใช้งานระบบจัดการสินค้า",
    text: [
      `สวัสดีคุณ ${opts.name}`,
      "",
      `${opts.invitedBy} เชิญคุณเข้าใช้งานระบบหลังบ้านในฐานะผู้ดูแลระบบ`,
      "กดลิงก์ด้านล่างเพื่อยืนยันและตั้งรหัสผ่านของคุณเอง:",
      "",
      opts.link,
      "",
      `ลิงก์นี้ใช้ได้ครั้งเดียว และหมดอายุ ${until}`,
      "ถ้าคุณไม่ได้คาดหวังอีเมลนี้ สามารถเพิกเฉยได้",
    ].join("\n"),
  };
}
