import { CONTENT_TYPES, readImageFile } from "@/lib/storage";

// Public on purpose: product images appear on the public product page.
// File names are random and never reused, so they can be cached forever.
export async function GET(_request: Request, ctx: RouteContext<"/media/[filename]">) {
  const { filename } = await ctx.params;
  const file = await readImageFile(filename);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": CONTENT_TYPES[filename.split(".").pop() ?? ""] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
