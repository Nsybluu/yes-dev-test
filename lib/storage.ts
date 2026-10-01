import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// The upload folder is chosen at runtime (UPLOAD_DIR), so the file accesses below carry
// `turbopackIgnore`: otherwise the build warns that it would trace the whole project.
// Uploaded files live outside /public: `next start` only serves public files that
// existed at build time, so anything uploaded later is served by app/media instead.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "storage", "uploads");

export const MEDIA_PREFIX = "/media/";

// Names are generated here (32 hex chars + a checked extension), never taken from the
// uploader, so a request can't reach anything but our own files.
const NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function saveImageFile(data: Uint8Array, ext: string) {
  await mkdir(/*turbopackIgnore: true*/ UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), data, { flag: "wx" });
  return name;
}

export const mediaUrl = (name: string) => `${MEDIA_PREFIX}${name}`;

export async function readImageFile(name: string) {
  if (!NAME_PATTERN.test(name)) return null;
  try {
    return await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

// Only files we created are ever deleted; other paths (e.g. the sample images in
// /public/uploads/samples) are ignored. A file that is already gone is not an error.
export async function deleteMediaFiles(imagePaths: string[]) {
  for (const imagePath of imagePaths) {
    if (!imagePath.startsWith(MEDIA_PREFIX)) continue;
    const name = imagePath.slice(MEDIA_PREFIX.length);
    if (!NAME_PATTERN.test(name)) continue;
    try {
      await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name));
    } catch (e) {
      if ((e as { code?: string }).code !== "ENOENT") throw e;
    }
  }
}
