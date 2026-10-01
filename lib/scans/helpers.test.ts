import assert from "node:assert/strict";
import { test } from "node:test";
import { deviceFromUserAgent, looksLikeBot, parseRange, rangeStart, scanSkipReason } from "./helpers";

const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const desktop = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

const headers = (init: Record<string, string>) => ({ get: (name: string) => init[name.toLowerCase()] ?? null });

test("real browsers count; crawlers, link previews and empty user agents do not", () => {
  assert.equal(looksLikeBot(iphone), false);
  assert.equal(looksLikeBot(desktop), false);
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "facebookexternalhit/1.1",
    "WhatsApp/2.23.20",
    "curl/8.4.0",
    "",
    null,
  ]) {
    assert.equal(looksLikeBot(ua), true, String(ua));
  }
});

test("a normal visit is counted", () => {
  assert.equal(scanSkipReason(headers({ "user-agent": iphone }), undefined), null);
});

test("prefetch requests, bots and admin previews are skipped, each for its own reason", () => {
  assert.equal(scanSkipReason(headers({ "user-agent": iphone, "sec-purpose": "prefetch" }), undefined), "prefetch");
  assert.equal(scanSkipReason(headers({ "user-agent": iphone, "next-router-prefetch": "1" }), undefined), "prefetch");
  assert.equal(scanSkipReason(headers({ "user-agent": "Googlebot/2.1" }), undefined), "bot");
  assert.equal(scanSkipReason(headers({ "user-agent": iphone }), "1"), "preview");
  assert.equal(scanSkipReason(headers({ "user-agent": iphone }), ["1"]), "preview");
  // other values of ?preview are not a way to skip counting
  assert.equal(scanSkipReason(headers({ "user-agent": iphone }), "0"), null);
});

test("device label", () => {
  assert.equal(deviceFromUserAgent(iphone), "มือถือ/แท็บเล็ต");
  assert.equal(deviceFromUserAgent(desktop), "คอมพิวเตอร์");
  assert.equal(deviceFromUserAgent(null), "ไม่ทราบ");
});

test("range parsing falls back to all and computes the start date", () => {
  assert.equal(parseRange(undefined), "all");
  assert.equal(parseRange("nonsense"), "all");
  assert.equal(parseRange("7d"), "7d");
  const now = new Date("2026-10-10T00:00:00Z");
  assert.equal(rangeStart("all", now), undefined);
  assert.equal(rangeStart("7d", now)?.toISOString(), "2026-10-03T00:00:00.000Z");
});
