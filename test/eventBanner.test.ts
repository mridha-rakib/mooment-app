import assert from "node:assert/strict";
import test from "node:test";
import {
  EVENT_BANNER_MAX_BYTES,
  EVENT_BANNER_FALLBACK_URI,
  getEventBannerContentPosition,
  getEventBannerKey,
  isAllowedEventBannerMimeType,
  isEventBannerFileSizeAllowed,
  normalizeEventBannerMimeType,
} from "../lib/eventBannerValidation";

// EVT-005 (narrow scope): JPEG/PNG-only validation, 15 MiB size cap, and a
// single authoritative banner key/fallback used across every rendering
// surface. These are pure functions — real runtime coverage, not source-text
// matching.

test("15 MiB is expressed in binary bytes, not a decimal approximation", () => {
  assert.equal(EVENT_BANNER_MAX_BYTES, 15 * 1024 * 1024);
  assert.equal(EVENT_BANNER_MAX_BYTES, 15728640);
});

test("normalizeEventBannerMimeType treats jpg and jpeg as the same type", () => {
  assert.equal(normalizeEventBannerMimeType("image/jpeg"), "image/jpeg");
  assert.equal(normalizeEventBannerMimeType("image/jpg"), "image/jpeg");
  assert.equal(normalizeEventBannerMimeType("IMAGE/JPG"), "image/jpeg");
  assert.equal(normalizeEventBannerMimeType("image/png"), "image/png");
  assert.equal(normalizeEventBannerMimeType("image/png; charset=binary"), "image/png");
  assert.equal(normalizeEventBannerMimeType(null), null);
  assert.equal(normalizeEventBannerMimeType(undefined), null);
});

test("JPEG and PNG are accepted; other formats are rejected", () => {
  assert.equal(isAllowedEventBannerMimeType("image/jpeg"), true);
  assert.equal(isAllowedEventBannerMimeType("image/jpg"), true);
  assert.equal(isAllowedEventBannerMimeType("image/png"), true);
  assert.equal(isAllowedEventBannerMimeType("image/webp"), false);
  assert.equal(isAllowedEventBannerMimeType("image/gif"), false);
  assert.equal(isAllowedEventBannerMimeType("image/heic"), false);
  assert.equal(isAllowedEventBannerMimeType("image/heif"), false);
  assert.equal(isAllowedEventBannerMimeType(null), false);
});

test("file size is accepted up to and including exactly 15 MiB, rejected above it", () => {
  assert.equal(isEventBannerFileSizeAllowed(1024), true);
  assert.equal(isEventBannerFileSizeAllowed(EVENT_BANNER_MAX_BYTES), true);
  assert.equal(isEventBannerFileSizeAllowed(EVENT_BANNER_MAX_BYTES + 1), false);
  assert.equal(isEventBannerFileSizeAllowed(0), false);
  assert.equal(isEventBannerFileSizeAllowed(-1), false);
  assert.equal(isEventBannerFileSizeAllowed(Number.NaN), false);
  assert.equal(isEventBannerFileSizeAllowed(undefined), false);
  assert.equal(isEventBannerFileSizeAllowed(null), false);
});

test("getEventBannerKey prefers bannerImageKey over bannerOriginalImageKey", () => {
  assert.equal(
    getEventBannerKey({ bannerImageKey: "events/banners/display.jpg", bannerOriginalImageKey: "events/banners/originals/original.jpg" }),
    "events/banners/display.jpg",
  );
});

test("getEventBannerKey falls back to bannerOriginalImageKey when the display key is missing", () => {
  assert.equal(
    getEventBannerKey({ bannerImageKey: null, bannerOriginalImageKey: "events/banners/originals/original.jpg" }),
    "events/banners/originals/original.jpg",
  );
});

test("getEventBannerKey returns null when neither key is present", () => {
  assert.equal(getEventBannerKey({ bannerImageKey: null, bannerOriginalImageKey: null }), null);
  assert.equal(getEventBannerKey(null), null);
  assert.equal(getEventBannerKey(undefined), null);
});

test("EVENT_BANNER_FALLBACK_URI is a single shared constant string", () => {
  assert.equal(typeof EVENT_BANNER_FALLBACK_URI, "string");
  assert.ok(EVENT_BANNER_FALLBACK_URI.length > 0);
});

test("getEventBannerContentPosition is undefined when there is no crop metadata (the common case today)", () => {
  assert.equal(getEventBannerContentPosition(null), undefined);
  assert.equal(getEventBannerContentPosition(undefined), undefined);
  assert.equal(getEventBannerContentPosition({}), undefined);
});

test("getEventBannerContentPosition derives a centered focal point from a normalized crop rect", () => {
  const position = getEventBannerContentPosition({
    crop: { x: 0.25, y: 0.1, width: 0.5, height: 0.4 },
  });

  assert.deepEqual(position, { left: "50%", top: "30%" });
});

test("getEventBannerContentPosition clamps a focal point that would fall outside the image", () => {
  const position = getEventBannerContentPosition({
    crop: { x: 0.8, y: 0.8, width: 0.5, height: 0.5 },
  });

  assert.deepEqual(position, { left: "100%", top: "100%" });
});
