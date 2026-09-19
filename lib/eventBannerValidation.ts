import type { EventImageDisplay, EventResponse } from "@/lib/events";

// Pure, dependency-free banner logic (MIME/size validation, key precedence,
// crop-focal derivation) split out from app/lib/eventBanner.ts so it can be
// unit-tested directly: the sibling module pulls in @/lib/storage -> @/lib/api
// -> react-native, which plain `bun test` (no Metro/Babel) cannot parse.

// Approved Event banner upload formats (mirrors the backend's
// EVENT_BANNER_ALLOWED_CONTENT_TYPES in api/src/modules/storage/storage.validation.ts).
export const EVENT_BANNER_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"] as const;
export type EventBannerAllowedMimeType = (typeof EVENT_BANNER_ALLOWED_MIME_TYPES)[number];

// 15 MiB, binary bytes (15 * 1024 * 1024) — matches the locked product
// decision. Keep in binary form; do not swap for a decimal approximation.
export const EVENT_BANNER_MAX_BYTES = 15 * 1024 * 1024;

// A single shared fallback image, used whenever an Event has no renderable
// banner, so the same Event never shows different fallback imagery on
// different surfaces (Feed uses its own icon-only empty state instead of an
// image and is unaffected by this constant).
export const EVENT_BANNER_FALLBACK_URI =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop";

/**
 * Normalizes a MIME type string as reported by the OS image picker (or a
 * filename-extension guess) to the canonical form used by validation.
 * Treats `image/jpg` as `image/jpeg` and strips any `;charset=...`-style
 * parameters/casing differences.
 */
export const normalizeEventBannerMimeType = (
  mimeType: string | null | undefined,
): string | null => {
  if (!mimeType) return null;

  const base = mimeType.split(";")[0]?.trim().toLowerCase();

  if (!base) return null;

  return base === "image/jpg" ? "image/jpeg" : base;
};

export const isAllowedEventBannerMimeType = (
  mimeType: string | null | undefined,
): mimeType is EventBannerAllowedMimeType => {
  const normalized = normalizeEventBannerMimeType(mimeType);

  return normalized !== null && (EVENT_BANNER_ALLOWED_MIME_TYPES as readonly string[]).includes(normalized);
};

export const isEventBannerFileSizeAllowed = (bytes: number | null | undefined): boolean =>
  typeof bytes === "number" && Number.isFinite(bytes) && bytes > 0 && bytes <= EVENT_BANNER_MAX_BYTES;

/**
 * Single authoritative key for rendering a persisted Event's banner across
 * every surface (Create/Edit editor preview, draft preview, Feed, Event
 * Detail, Map). Prefers `bannerImageKey` — the processed/display asset that
 * reflects the user's actual crop/selection — and falls back to
 * `bannerOriginalImageKey` only when the display key is unavailable (a
 * legacy Event, or a display-key upload that failed while the original
 * still succeeded).
 */
export const getEventBannerKey = (
  event?: Pick<EventResponse, "bannerImageKey" | "bannerOriginalImageKey"> | null,
): string | null => event?.bannerImageKey ?? event?.bannerOriginalImageKey ?? null;

export type EventBannerContentPosition = { left: string; top: string };

/**
 * Derives an expo-image `contentPosition` from the normalized (0-1) crop
 * rect stored in `bannerImageDisplay.crop`, so every surface that honours
 * this metadata renders the same focal point under `contentFit="cover"`.
 * Returns `undefined` (expo-image's own default: centered) when no crop
 * metadata is present, which is the common case today.
 */
export const getEventBannerContentPosition = (
  display?: EventImageDisplay | null,
): EventBannerContentPosition | undefined => {
  const crop = display?.crop;

  if (!crop) return undefined;

  const focalX = crop.x + crop.width / 2;
  const focalY = crop.y + crop.height / 2;
  // Round to avoid floating-point noise (e.g. 0.1 + 0.2 -> 30.000000000000004).
  const toPercent = (value: number) => `${Math.round(Math.min(100, Math.max(0, value * 100)) * 100) / 100}%`;

  return {
    left: toPercent(focalX),
    top: toPercent(focalY),
  };
};
