import { getCurrentLocationIfPermissionGranted } from "@/lib/locationSharing";

// Passive ranking-location read for the Home Smart Feed. It NEVER prompts for a
// permission (it reuses getCurrentLocationIfPermissionGranted, which only reads
// when permission is already granted) and NEVER blocks the feed: a slow or
// failed read simply resolves to "no ranking coordinates", and the backend
// falls back to GeoIP.
const RANKING_LOCATION_TIMEOUT_MS = 2000;

export type SmartFeedRankingLocationParams =
  | { rankingLatitude: number; rankingLongitude: number }
  | Record<string, never>;

type Coordinate = { latitude: number; longitude: number };

const isValidCoordinate = (value: Coordinate | null | undefined): value is Coordinate =>
  !!value &&
  typeof value.latitude === "number" &&
  typeof value.longitude === "number" &&
  Number.isFinite(value.latitude) &&
  Number.isFinite(value.longitude) &&
  value.latitude >= -90 &&
  value.latitude <= 90 &&
  value.longitude >= -180 &&
  value.longitude <= 180;

export const getSmartFeedRankingLocation = async (
  read: () => Promise<Coordinate | null> = getCurrentLocationIfPermissionGranted,
  timeoutMs: number = RANKING_LOCATION_TIMEOUT_MS,
): Promise<SmartFeedRankingLocationParams> => {
  try {
    const result = await Promise.race([
      read(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);

    if (isValidCoordinate(result)) {
      return { rankingLatitude: result.latitude, rankingLongitude: result.longitude };
    }
  } catch {
    // Never block or fail the feed on a location read.
  }

  return {};
};
