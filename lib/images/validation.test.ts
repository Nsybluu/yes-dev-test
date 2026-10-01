import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import { MAX_IMAGE_BYTES } from "./constants";
import { inspectImage } from "./validation";

// --- tiny hand-made files, just enough header for the size parser -------------
function crc32(buf: Buffer) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w: number, h: number) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.alloc(h * (1 + w * 3)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function jpeg(w: number, h: number) {
  const sof = Buffer.from([0xff, 0xc0, 0, 11, 8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0]);
  // real JPEGs start with an APP0 (JFIF) segment before the frame header
  const app0 = Buffer.from([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]);
}
function webp(w: number, h: number) {
  const vp8x = Buffer.alloc(10);
  vp8x.writeUIntLE(w - 1, 4, 3);
  vp8x.writeUIntLE(h - 1, 7, 3);
  const body = Buffer.concat([Buffer.from("WEBP"), Buffer.from("VP8X"), Buffer.from([10, 0, 0, 0]), vp8x]);
  const riff = Buffer.alloc(8);
  riff.write("RIFF");
  riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
}

test("accepts jpg, png and webp, detecting the type from the bytes", () => {
  for (const [file, ext] of [[jpeg(800, 800), "jpg"], [png(800, 800), "png"], [webp(800, 800), "webp"]] as const) {
    const r = inspectImage(file, "a");
    assert.equal(r.ok, true, ext);
    if (r.ok) {
      assert.equal(r.ext, ext);
      assert.equal(r.width, 800);
      assert.equal(r.warning, null);
    }
  }
});

test("a square image of at least 800px gives no warning; others warn but are accepted", () => {
  const small = inspectImage(png(600, 600), "small.png");
  assert.equal(small.ok && small.warning !== null, true);
  const wide = inspectImage(png(1200, 800), "wide.png");
  assert.equal(wide.ok && /สี่เหลี่ยมจัตุรัส/.test(wide.warning ?? ""), true);
});

test("rejects files over 2 MB with the size in the reason", () => {
  const r = inspectImage(new Uint8Array(MAX_IMAGE_BYTES + 1), "big.png");
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.error : "", /ใหญ่เกินไป.*2 MB/);
});

test("rejects things that are not images, whatever they are named", () => {
  const text = inspectImage(Buffer.from("hello world, definitely not a picture"), "fake.png");
  assert.equal(text.ok, false);
  const html = inspectImage(Buffer.from("<html><script>alert(1)</script></html>"), "x.jpg");
  assert.equal(html.ok, false);
  assert.equal(inspectImage(new Uint8Array(0), "empty.png").ok, false);
});

test("rejects real images in formats we don't allow (svg, gif)", () => {
  const svg = inspectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'), "a.png");
  assert.equal(svg.ok, false);
  const gif = Buffer.from("474946383961" + "0a000a00" + "00".repeat(20), "hex");
  const g = inspectImage(gif, "a.gif");
  assert.equal(g.ok, false);
});

test("rejects absurd dimensions", () => {
  assert.equal(inspectImage(png(9000, 100), "wide.png").ok, false);
});
