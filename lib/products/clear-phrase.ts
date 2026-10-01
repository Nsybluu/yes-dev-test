// Browser-safe pieces of "clear all products". Kept apart from clear.ts, which
// touches the file system and must never be imported by a client component.

// The phrase an admin must type before "clear all products" is allowed
export const CLEAR_PHRASE = "ลบสินค้าทั้งหมด";

export type ClearCounts = { products: number; images: number; scans: number };
