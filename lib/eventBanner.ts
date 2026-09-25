import { getStorageFileUrl } from "@/lib/storage";
import type { EventResponse } from "@/lib/events";
import {
  getEventBannerKey,
  EVENT_BANNER_FALLBACK_URI,
} from "@/lib/eventBannerValidation";

// Re-export the pure banner logic (MIME/size validation, key precedence,
// crop-focal derivation) — kept in a separate module so it can be unit
// tested without pulling in @/lib/storage's react-native dependency chain.
// See app/lib/eventBannerValidation.ts.
export {
  EVENT_BANNER_ALLOWED_MIME_TYPES,
  EVENT_BANNER_MAX_BYTES,
  EVENT_BANNER_FALLBACK_URI,
  normalizeEventBannerMimeType,
  isAllowedEventBannerMimeType,
  isEventBannerFileSizeAllowed,
  getEventBannerKey,
  getEventBannerContentPosition,
} from "@/lib/eventBannerValidation";
export type {
  EventBannerAllowedMimeType,
  EventBannerContentPosition,
} from "@/lib/eventBannerValidation";

export const resolveEventBannerUri = (
  event?: Pick<EventResponse, "bannerImageKey" | "bannerOriginalImageKey"> | null,
  fallback: string | null = EVENT_BANNER_FALLBACK_URI,
): string | null => {
  const key = getEventBannerKey(event);

  if (!key) return fallback;

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
};
