import assert from "node:assert/strict";
import { test } from "node:test";
import { parseUserAgent, summarizeDevices } from "./devices";

// real-world user agent strings
const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  // an iPad in its default "desktop site" mode says it is a Mac
  ipadDesktopMode: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  androidPhone: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  windowsChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  linuxFirefox: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
  chromeOs: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  windowsPhone: "Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 Mobile Safari/537.36 Edge/14.14263",
  kindle: "Mozilla/5.0 (Linux; Android 9; KFMAWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/126.5.1 like Chrome/126.0.0.0 Safari/537.36",
};

test("phones", () => {
  assert.deepEqual(parseUserAgent(UA.iphone), { type: "mobile", os: "iOS" });
  assert.deepEqual(parseUserAgent(UA.iphoneChrome), { type: "mobile", os: "iOS" });
  assert.deepEqual(parseUserAgent(UA.androidPhone), { type: "mobile", os: "Android" });
});

test("tablets: iPad says iPad, an Android tablet is an Android without 'Mobile'", () => {
  assert.deepEqual(parseUserAgent(UA.ipad), { type: "tablet", os: "iOS" });
  assert.deepEqual(parseUserAgent(UA.androidTablet), { type: "tablet", os: "Android" });
  assert.deepEqual(parseUserAgent(UA.kindle), { type: "tablet", os: "Android" });
});

test("computers", () => {
  assert.deepEqual(parseUserAgent(UA.windowsChrome), { type: "desktop", os: "Windows" });
  assert.deepEqual(parseUserAgent(UA.macChrome), { type: "desktop", os: "macOS" });
  assert.deepEqual(parseUserAgent(UA.linuxFirefox), { type: "desktop", os: "Linux" });
  assert.deepEqual(parseUserAgent(UA.chromeOs), { type: "desktop", os: "ChromeOS" });
});

test("known limit: an iPad in desktop mode cannot be told apart from a Mac", () => {
  assert.deepEqual(parseUserAgent(UA.ipadDesktopMode), { type: "desktop", os: "macOS" });
});

test("Windows Phone is a phone, and Linux inside an Android UA does not make it a computer", () => {
  assert.equal(parseUserAgent(UA.windowsPhone).type, "mobile");
  assert.equal(parseUserAgent(UA.androidPhone).os, "Android");
});

test("empty or unrecognised user agents are unknown, never guessed", () => {
  for (const ua of [null, undefined, "", "   "]) assert.deepEqual(parseUserAgent(ua), { type: "unknown", os: "unknown" });
  assert.deepEqual(parseUserAgent("SomeCustomClient/1.0"), { type: "unknown", os: "other" });
});

test("summary counts per device and system, biggest first, shares add up", () => {
  const s = summarizeDevices([
    { userAgent: UA.iphone, count: 5 },
    { userAgent: UA.iphoneChrome, count: 2 }, // same device kind, different string: merged
    { userAgent: UA.windowsChrome, count: 3 },
    { userAgent: UA.macChrome, count: 1 },
    { userAgent: UA.ipad, count: 1 },
    { userAgent: null, count: 1 },
  ]);
  assert.equal(s.total, 13);
  assert.deepEqual(s.types.map((t) => [t.key, t.count]), [["mobile", 7], ["desktop", 4], ["tablet", 1], ["unknown", 1]]);
  assert.deepEqual(s.systems.map((t) => [t.key, t.count]), [["iOS", 8], ["Windows", 3], ["macOS", 1], ["unknown", 1]]);
  assert.ok(Math.abs(s.types.reduce((sum, t) => sum + t.share, 0) - 1) < 1e-9);
  assert.equal(s.types[0].label, "มือถือ");
});

test("no data gives an empty summary, not NaN", () => {
  assert.deepEqual(summarizeDevices([]), { total: 0, types: [], systems: [] });
});
