// Show whole baht without decimals (฿1,290) and keep them only when present (฿1,290.50)
export function formatPrice(price: { toNumber(): number } | number) {
  const value = typeof price === "number" ? price : price.toNumber();
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}
