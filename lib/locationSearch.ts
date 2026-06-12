import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";

export type LocationSearchResult = {
  id: string;
  label: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isVenue: boolean;
  matchLabel?: string;
};

export type LocationSearchContext = {
  latitude: number;
  longitude: number;
  label?: string | null;
  countryCode?: string | null;
};

type LocationSearchOptions = {
  signal?: AbortSignal;
};

type MapboxFeature = {
  id?: string;
  place_name?: string;
  text?: string;
  center?: [number, number];
  geometry?: {
    coordinates?: [number, number];
  };
  place_type?: string[];
  context?: Array<{
    id?: string;
    text?: string;
    short_code?: string;
  }>;
  properties?: {
    address?: string;
    category?: string;
    feature_type?: string;
    full_address?: string;
    name?: string;
    place_formatted?: string;
    maki?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    context?: {
      country?: {
        country_code?: string;
        name?: string;
      };
      place?: {
        name?: string;
      };
      locality?: {
        name?: string;
      };
      region?: {
        name?: string;
      };
    };
  };
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

const MAPBOX_GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const MAPBOX_SEARCHBOX_FORWARD_URL = "https://api.mapbox.com/search/searchbox/v1/forward";
const LOCATION_SEARCH_CACHE_LIMIT = 50;
const DHAKA_FALLBACK_CONTEXT: LocationSearchContext = {
  countryCode: "bd",
  label: "Dhaka, Bangladesh",
  latitude: 23.77195,
  longitude: 90.39018,
};

const locationSearchCache = new Map<string, LocationSearchResult[]>();

const CURATED_VENUES: Array<LocationSearchResult & { aliases: string[] }> = [
  {
    address: "Bangladesh Air Force Officers' Mess, Old Airport Road, Tejgaon, Dhaka 1215, Bangladesh",
    aliases: [
      "baf falcon hall",
      "b a f falcon hall",
      "falcon hall dhaka",
      "falcon hall tejgaon",
      "baf falcon hall dhaka",
    ],
    id: "curated-bd-baf-falcon-hall",
    isVenue: true,
    label: "BAF Falcon Hall, Old Airport Road, Tejgaon, Dhaka 1215, Bangladesh",
    latitude: 23.77195,
    longitude: 90.39018,
    matchLabel: "Venue",
    name: "BAF Falcon Hall",
  },
];

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceInKm = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) => {
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(second.latitude - first.latitude);
  const deltaLongitude = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toIdSlug = (value: string, fallback = "location") => normalizeText(value).replace(/\s+/g, "-") || fallback;

const tokenize = (value: string) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);

const getCountryCodeFromContext = (context?: LocationSearchContext | null) => {
  if (context?.countryCode) {
    return context.countryCode.toLowerCase();
  }

  const label = context?.label?.toLowerCase() ?? "";

  if (label.includes("bangladesh")) {
    return "bd";
  }

  return null;
};

const getSearchContext = (query: string, context?: LocationSearchContext | null): LocationSearchContext | null => {
  const normalizedQuery = normalizeText(query);
  const isDhakaSpecificQuery =
    normalizedQuery.includes("dhaka") ||
    normalizedQuery.includes("tejgaon") ||
    normalizedQuery.includes("baf") ||
    normalizedQuery.includes("falcon hall");

  if (isDhakaSpecificQuery && (!context || distanceInKm(context, DHAKA_FALLBACK_CONTEXT) > 500)) {
    return DHAKA_FALLBACK_CONTEXT;
  }

  if (context) {
    return {
      ...context,
      countryCode: getCountryCodeFromContext(context),
    };
  }

  return null;
};

const buildLocalBBox = (context: LocationSearchContext, radiusKm = 30) => {
  const latitudeDelta = radiusKm / 111;
  const longitudeDelta = radiusKm / (111 * Math.max(Math.cos(toRadians(context.latitude)), 0.2));

  return [
    context.longitude - longitudeDelta,
    context.latitude - latitudeDelta,
    context.longitude + longitudeDelta,
    context.latitude + latitudeDelta,
  ].join(",");
};

const getSearchCacheKey = (query: string, context?: LocationSearchContext | null) => {
  const normalizedQuery = normalizeText(query);
  const normalizedContext = context
    ? [
        context.latitude.toFixed(3),
        context.longitude.toFixed(3),
        getCountryCodeFromContext(context) ?? "",
        normalizeText(context.label ?? ""),
      ].join("|")
    : "global";

  return `${normalizedQuery}::${normalizedContext}`;
};

const storeSearchResults = (key: string, results: LocationSearchResult[]) => {
  if (locationSearchCache.has(key)) {
    locationSearchCache.delete(key);
  }

  locationSearchCache.set(key, results);

  while (locationSearchCache.size > LOCATION_SEARCH_CACHE_LIMIT) {
    const oldestKey = locationSearchCache.keys().next().value as string | undefined;

    if (!oldestKey) {
      break;
    }

    locationSearchCache.delete(oldestKey);
  }
};

const getFeatureCoordinates = (feature: MapboxFeature): [number, number] | null => {
  const searchBoxCoordinates = feature.properties?.coordinates;

  if (
    typeof searchBoxCoordinates?.longitude === "number" &&
    typeof searchBoxCoordinates.latitude === "number"
  ) {
    return [searchBoxCoordinates.longitude, searchBoxCoordinates.latitude];
  }

  const coordinates = feature.geometry?.coordinates ?? feature.center;

  if (typeof coordinates?.[0] === "number" && typeof coordinates[1] === "number") {
    return coordinates;
  }

  return null;
};

const getFeatureCountryCode = (feature: MapboxFeature) => {
  const searchBoxCountryCode = feature.properties?.context?.country?.country_code;

  if (searchBoxCountryCode) {
    return searchBoxCountryCode.toLowerCase();
  }

  return feature.context
    ?.find((item) => item.id?.startsWith("country."))
    ?.short_code?.toLowerCase() ?? null;
};

const getFeaturePlaceName = (feature: MapboxFeature) =>
  feature.properties?.context?.place?.name ||
  feature.properties?.context?.locality?.name ||
  feature.context?.find((item) => item.id?.startsWith("place.") || item.id?.startsWith("locality."))?.text ||
  "";

const toLocationResult = (feature: MapboxFeature, fallbackId: string): LocationSearchResult | null => {
  const coordinates = getFeatureCoordinates(feature);

  if (!coordinates) {
    return null;
  }

  const [longitude, latitude] = coordinates;
  const name = feature.properties?.name?.trim() || feature.text?.trim() || "Selected location";
  const placeFormatted = feature.properties?.place_formatted?.trim();
  const fullAddress = feature.properties?.full_address?.trim();
  const mapboxPlaceName = feature.place_name?.trim();
  const label = fullAddress || (placeFormatted ? `${name}, ${placeFormatted}` : mapboxPlaceName || name);
  const featureType = feature.properties?.feature_type || feature.place_type?.[0] || "";
  const category = feature.properties?.category || "";
  const isVenue =
    featureType === "poi" ||
    feature.place_type?.includes("poi") ||
    Boolean(feature.properties?.maki) ||
    /hall|center|centre|hotel|restaurant|venue|convention|office|campus/i.test(`${name} ${category}`);

  return {
    address: label,
    id: feature.id ?? fallbackId,
    isVenue,
    label,
    latitude,
    longitude,
    matchLabel: isVenue ? "Venue" : getFeaturePlaceName(feature) || undefined,
    name,
  };
};

const readLocationResults = async (
  url: string,
  fallbackIdPrefix = "location",
  signal?: AbortSignal,
): Promise<LocationSearchResult[]> => {
  const response = await fetch(url, signal ? { signal } : undefined);

  if (!response.ok) {
    throw new Error("Unable to search locations right now.");
  }

  const data = (await response.json()) as MapboxResponse;

  return (data.features ?? [])
    .map((feature, index) => toLocationResult(feature, `${fallbackIdPrefix}-${index}`))
    .filter((result): result is LocationSearchResult => Boolean(result));
};

const searchBoxForward = async (
  query: string,
  context?: LocationSearchContext | null,
  bbox?: string,
  options: LocationSearchOptions = {},
): Promise<LocationSearchResult[]> => {
  const params = new URLSearchParams({
    access_token: MAPBOX_PUBLIC_TOKEN,
    language: "en",
    limit: "8",
    q: query,
  });

  if (context) {
    params.set("proximity", `${context.longitude},${context.latitude}`);
  }

  if (bbox) {
    params.set("bbox", bbox);
  }

  return readLocationResults(
    `${MAPBOX_SEARCHBOX_FORWARD_URL}?${params.toString()}`,
    `searchbox-${bbox ? "local" : "global"}-${toIdSlug(query)}`,
    options.signal,
  );
};

const geocodeSearch = async (
  query: string,
  context?: LocationSearchContext | null,
  bbox?: string,
  options: LocationSearchOptions = {},
): Promise<LocationSearchResult[]> => {
  const params = new URLSearchParams({
    access_token: MAPBOX_PUBLIC_TOKEN,
    autocomplete: "true",
    language: "en",
    limit: "8",
    types: "address,poi,place,locality,neighborhood,district",
  });
  const countryCode = getCountryCodeFromContext(context);

  if (context) {
    params.set("proximity", `${context.longitude},${context.latitude}`);
  }

  if (bbox) {
    params.set("bbox", bbox);
  }

  if (countryCode) {
    params.set("country", countryCode);
  }

  return readLocationResults(
    `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?${params.toString()}`,
    `geocode-${bbox ? "local" : "global"}-${toIdSlug(query)}`,
    options.signal,
  );
};

const curatedSearch = (query: string, context?: LocationSearchContext | null): LocationSearchResult[] => {
  const normalizedQuery = normalizeText(query);

  return CURATED_VENUES.filter((venue) => {
    const aliasMatch = venue.aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);

      return normalizedAlias.includes(normalizedQuery) || normalizedQuery.includes(normalizedAlias);
    });

    if (!aliasMatch) {
      return false;
    }

    if (!context) {
      return true;
    }

    return distanceInKm(context, venue) < 120 || normalizeText(context.label ?? "").includes("dhaka");
  }).map(({ aliases: _aliases, ...venue }) => venue);
};

const localFallbackSearch = (
  query: string,
  context?: LocationSearchContext | null,
  localResults: LocationSearchResult[] = [],
): LocationSearchResult[] => {
  if (!context || query.trim().length < 3) {
    return [];
  }

  const bestLocalResult = localResults.find((result) => distanceInKm(context, result) < 60);
  const label = query.trim();
  const anchor = bestLocalResult ?? {
    address: context.label || "Nearby selected map area",
    latitude: context.latitude,
    longitude: context.longitude,
  };
  const contextLabel = bestLocalResult?.address || context.label || "Nearby selected map area";

  return [
    {
      address: `${label}, ${contextLabel}`,
      id: `typed-nearby-${normalizeText(label).replace(/\s+/g, "-")}`,
      isVenue: /hall|center|centre|venue|convention|hotel|restaurant|office|club|auditorium/i.test(label),
      label: `${label}, ${contextLabel}`,
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      matchLabel: "Near map area",
      name: label,
    },
  ];
};

const dedupeResults = (results: LocationSearchResult[]) => {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = `${normalizeText(result.name)}:${result.latitude.toFixed(4)}:${result.longitude.toFixed(4)}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const ensureUniqueResultIds = (results: LocationSearchResult[]) => {
  const seen = new Set<string>();

  return results.map((result, index) => {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      return result;
    }

    const baseId = `${result.id}-${toIdSlug(result.name)}-${result.latitude.toFixed(5)}-${result.longitude.toFixed(5)}`;
    let nextId = `${baseId}-${index}`;
    let suffix = index;

    while (seen.has(nextId)) {
      suffix += 1;
      nextId = `${baseId}-${suffix}`;
    }

    seen.add(nextId);
    return {
      ...result,
      id: nextId,
    };
  });
};

const rankResults = (
  query: string,
  results: LocationSearchResult[],
  context?: LocationSearchContext | null,
) => {
  const queryTokens = tokenize(query);
  const normalizedQuery = normalizeText(query);

  return [...results].sort((first, second) => {
    const score = (result: LocationSearchResult) => {
      const normalizedName = normalizeText(result.name);
      const normalizedAddress = normalizeText(result.address);
      const tokenMatches = queryTokens.filter((token) => normalizedAddress.includes(token)).length;
      const exactNameScore =
        normalizedName === normalizedQuery ? 45 : normalizedName.includes(normalizedQuery) ? 28 : 0;
      const venueScore = result.isVenue ? 18 : 0;
      const curatedScore = result.id.startsWith("curated-") ? 80 : 0;
      const typedScore = result.id.startsWith("typed-nearby-") ? 12 : 0;
      const distanceScore = context ? Math.max(0, 35 - distanceInKm(context, result) / 3) : 0;

      return curatedScore + typedScore + exactNameScore + venueScore + tokenMatches * 10 + distanceScore;
    };

    return score(second) - score(first);
  });
};

export const searchLocations = async (
  query: string,
  context?: LocationSearchContext | null,
  options: LocationSearchOptions = {},
): Promise<LocationSearchResult[]> => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const cacheKey = getSearchCacheKey(trimmedQuery, context);
  const cachedResults = locationSearchCache.get(cacheKey);

  if (cachedResults) {
    return [...cachedResults];
  }

  const searchContext = getSearchContext(trimmedQuery, context);
  const bbox = searchContext ? buildLocalBBox(searchContext) : undefined;
  const curatedResults = curatedSearch(trimmedQuery, searchContext);
  const searchboxPromise = searchBoxForward(trimmedQuery, searchContext, bbox, options);
  const geocodePromise = geocodeSearch(trimmedQuery, searchContext, bbox, options);
  const remoteResults = await Promise.any([
    searchboxPromise.then((results) => {
      if (results.length === 0) {
        throw new Error("empty searchbox response");
      }

      return results;
    }),
    geocodePromise.then((results) => {
      if (results.length === 0) {
        throw new Error("empty geocode response");
      }

      return results;
    }),
  ]).catch(async () => {
    const settledResults = await Promise.allSettled([searchboxPromise, geocodePromise]);

    return settledResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  });
  const fallbackResults = localFallbackSearch(trimmedQuery, searchContext, remoteResults);
  const rankedResults = rankResults(
    trimmedQuery,
    dedupeResults([...curatedResults, ...remoteResults, ...fallbackResults]),
    searchContext,
  );
  const finalResults = ensureUniqueResultIds(rankedResults.slice(0, 8));

  storeSearchResults(cacheKey, finalResults);

  return finalResults;
};

export const reverseGeocodeLocation = async (
  latitude: number,
  longitude: number,
): Promise<LocationSearchResult | null> => {
  const params = new URLSearchParams({
    access_token: MAPBOX_PUBLIC_TOKEN,
    language: "en",
    limit: "1",
  });
  const results = await readLocationResults(
    `${MAPBOX_GEOCODING_URL}/${longitude},${latitude}.json?${params.toString()}`,
    `reverse-geocode-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
  );

  return results[0] ?? null;
};
