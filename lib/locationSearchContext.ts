export type LocationSearchContext = {
  latitude: number;
  longitude: number;
  label?: string | null;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
};

const cleanDisplayText = (value?: string | null) =>
  (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();

const normalizeCountryCode = (value?: string | null) => {
  const normalized = cleanDisplayText(value).toLowerCase();

  return /^[a-z]{2}$/.test(normalized) ? normalized : null;
};

const isFiniteCoordinate = (latitude: unknown, longitude: unknown) =>
  typeof latitude === "number" &&
  typeof longitude === "number" &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

export const getLocationSearchContext = (
  context?: LocationSearchContext | null,
): LocationSearchContext | null => {
  if (!context || !isFiniteCoordinate(context.latitude, context.longitude)) {
    return null;
  }

  return {
    city: cleanDisplayText(context.city),
    country: cleanDisplayText(context.country),
    countryCode: normalizeCountryCode(context.countryCode),
    label: cleanDisplayText(context.label),
    latitude: context.latitude,
    longitude: context.longitude,
    region: cleanDisplayText(context.region),
  };
};

export const getLocationSearchProximityParam = (
  context?: LocationSearchContext | null,
): string | null => {
  const searchContext = getLocationSearchContext(context);

  return searchContext ? `${searchContext.longitude},${searchContext.latitude}` : null;
};
