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
  providerId?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  providerOrder?: number;
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
    mapbox_id?: string;
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
      postcode?: {
        name?: string;
      };
    };
  };
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

type MapboxSuggestResponse = {
  suggestions?: Array<{
    mapbox_id?: string;
  }>;
};

const MAPBOX_GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const MAPBOX_SEARCHBOX_FORWARD_URL = "https://api.mapbox.com/search/searchbox/v1/forward";
const MAPBOX_SEARCHBOX_SUGGEST_URL = "https://api.mapbox.com/search/searchbox/v1/suggest";
const MAPBOX_SEARCHBOX_RETRIEVE_URL = "https://api.mapbox.com/search/searchbox/v1/retrieve";
const LOCATION_SEARCH_CACHE_LIMIT = 50;
const LOCATION_SEARCH_TIMEOUT_MS = 8000;

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

const normalizeSegmentForCompare = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const cleanDisplayText = (value?: string | null) =>
  (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();

const dedupeAdjacentAddressSegments = (value: string) => {
  const segments = value
    .split(",")
    .map((segment) => cleanDisplayText(segment))
    .filter(Boolean);
  const dedupedSegments = segments.filter((segment, index) => {
    if (index === 0) {
      return true;
    }

    return normalizeSegmentForCompare(segment) !== normalizeSegmentForCompare(segments[index - 1]);
  });

  return dedupedSegments.join(", ");
};

const removeLeadingNameFromAddress = (address: string, name: string) => {
  const cleanAddress = dedupeAdjacentAddressSegments(cleanDisplayText(address));
  const cleanName = cleanDisplayText(name);

  if (!cleanAddress || !cleanName) {
    return cleanAddress;
  }

  const normalizedAddress = normalizeSegmentForCompare(cleanAddress);
  const normalizedName = normalizeSegmentForCompare(cleanName);

  if (normalizedAddress === normalizedName) {
    return "";
  }

  if (normalizedAddress.startsWith(`${normalizedName}, `)) {
    return cleanDisplayText(cleanAddress.slice(cleanName.length + 1));
  }

  if (normalizedAddress.startsWith(`${normalizedName} - `)) {
    return cleanDisplayText(cleanAddress.slice(cleanName.length + 3));
  }

  return cleanAddress;
};

const buildLocationLabel = (name: string, address: string) => {
  if (!address) {
    return name;
  }

  if (!name) {
    return address;
  }

  return `${name}, ${address}`;
};

const toIdSlug = (value: string, fallback = "location") => normalizeText(value).replace(/\s+/g, "-") || fallback;

const tokenize = (value: string) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);

const isFiniteCoordinate = (latitude: unknown, longitude: unknown) =>
  typeof latitude === "number" &&
  typeof longitude === "number" &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const getSearchContext = (context?: LocationSearchContext | null): LocationSearchContext | null => {
  if (!context || !isFiniteCoordinate(context.latitude, context.longitude)) {
    return null;
  }

  return {
    label: context.label,
    latitude: context.latitude,
    longitude: context.longitude,
  };
};

const getSearchCacheKey = (query: string, context?: LocationSearchContext | null) => {
  const normalizedQuery = normalizeText(query);
  const searchContext = getSearchContext(context);
  const normalizedContext = searchContext
    ? [searchContext.latitude.toFixed(3), searchContext.longitude.toFixed(3)].join("|")
    : "global";

  return `worldwide-v2::${normalizedQuery}::${normalizedContext}`;
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

const getFeatureContextValue = (feature: MapboxFeature, prefix: string) =>
  feature.context?.find((item) => item.id?.startsWith(prefix))?.text;

const getFeaturePlaceName = (feature: MapboxFeature) =>
  feature.properties?.context?.place?.name ||
  feature.properties?.context?.locality?.name ||
  feature.context?.find((item) => item.id?.startsWith("place.") || item.id?.startsWith("locality."))?.text ||
  "";

const getFeatureRegion = (feature: MapboxFeature) =>
  feature.properties?.context?.region?.name || getFeatureContextValue(feature, "region.") || "";

const getFeaturePostalCode = (feature: MapboxFeature) =>
  feature.properties?.context?.postcode?.name || getFeatureContextValue(feature, "postcode.") || "";

const toLocationResult = (
  feature: MapboxFeature,
  fallbackId: string,
  providerOrder: number,
): LocationSearchResult | null => {
  const coordinates = getFeatureCoordinates(feature);

  if (!coordinates) {
    return null;
  }

  const [longitude, latitude] = coordinates;

  if (!isFiniteCoordinate(latitude, longitude)) {
    return null;
  }

  const name = cleanDisplayText(feature.properties?.name || feature.text || "Selected location");
  const placeFormatted = cleanDisplayText(feature.properties?.place_formatted);
  const fullAddress = cleanDisplayText(feature.properties?.full_address);
  const mapboxPlaceName = cleanDisplayText(feature.place_name);
  const rawAddress = fullAddress || placeFormatted || mapboxPlaceName;
  const address = removeLeadingNameFromAddress(rawAddress, name);
  const label = buildLocationLabel(name, address);
  const featureType = feature.properties?.feature_type || feature.place_type?.[0] || "";
  const category = feature.properties?.category || "";
  const isVenue =
    featureType === "poi" ||
    feature.place_type?.includes("poi") ||
    Boolean(feature.properties?.maki) ||
    /hall|center|centre|hotel|restaurant|venue|convention|office|campus/i.test(`${name} ${category}`);
  const country = feature.properties?.context?.country?.name || getFeatureContextValue(feature, "country.") || "";
  const countryCode = getFeatureCountryCode(feature) || undefined;
  const city = getFeaturePlaceName(feature);
  const region = getFeatureRegion(feature);
  const postalCode = getFeaturePostalCode(feature);

  return {
    address,
    id: feature.id ?? feature.properties?.mapbox_id ?? fallbackId,
    isVenue,
    label,
    latitude,
    longitude,
    matchLabel: isVenue ? "Venue" : getFeaturePlaceName(feature) || undefined,
    name,
    providerId: feature.id ?? feature.properties?.mapbox_id,
    country: country || undefined,
    countryCode,
    region: region || undefined,
    city: city || undefined,
    postalCode: postalCode || undefined,
    providerOrder,
  };
};

const fetchWithTimeout = async (url: string, signal?: AbortSignal): Promise<Response> => {
  if (signal?.aborted) {
    throw new Error("Location search aborted.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOCATION_SEARCH_TIMEOUT_MS);
  const abortRequest = () => controller.abort();

  signal?.addEventListener("abort", abortRequest, { once: true });

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortRequest);
  }
};

const readLocationResults = async (
  url: string,
  fallbackIdPrefix = "location",
  signal?: AbortSignal,
  providerOrderOffset = 0,
): Promise<LocationSearchResult[]> => {
  const response = await fetchWithTimeout(url, signal);

  if (!response.ok) {
    throw new Error("Unable to search locations right now.");
  }

  const data = (await response.json()) as MapboxResponse;

  return (data.features ?? [])
    .map((feature, index) => toLocationResult(feature, `${fallbackIdPrefix}-${index}`, index + providerOrderOffset))
    .filter((result): result is LocationSearchResult => Boolean(result));
};

const searchBoxForward = async (
  query: string,
  context?: LocationSearchContext | null,
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

  return readLocationResults(
    `${MAPBOX_SEARCHBOX_FORWARD_URL}?${params.toString()}`,
    `searchbox-global-${toIdSlug(query)}`,
    options.signal,
  );
};

const createSearchSessionToken = () => `location-search-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const searchBoxSuggest = async (
  query: string,
  context?: LocationSearchContext | null,
  options: LocationSearchOptions = {},
): Promise<LocationSearchResult[]> => {
  const sessionToken = createSearchSessionToken();
  const params = new URLSearchParams({
    access_token: MAPBOX_PUBLIC_TOKEN,
    language: "en",
    limit: "5",
    q: query,
    session_token: sessionToken,
  });

  if (context) {
    params.set("proximity", `${context.longitude},${context.latitude}`);
  }

  const response = await fetchWithTimeout(`${MAPBOX_SEARCHBOX_SUGGEST_URL}?${params.toString()}`, options.signal);

  if (!response.ok) {
    throw new Error("Unable to search locations right now.");
  }

  const data = (await response.json()) as MapboxSuggestResponse;
  const suggestions = (data.suggestions ?? []).filter((suggestion) => Boolean(suggestion.mapbox_id));
  const retrievedResults = await Promise.allSettled(
    suggestions.map((suggestion, index) => {
      const retrieveParams = new URLSearchParams({
        access_token: MAPBOX_PUBLIC_TOKEN,
        session_token: sessionToken,
      });

      return readLocationResults(
        `${MAPBOX_SEARCHBOX_RETRIEVE_URL}/${encodeURIComponent(suggestion.mapbox_id as string)}?${retrieveParams.toString()}`,
        `suggest-global-${toIdSlug(query)}-${index}`,
        options.signal,
        index,
      );
    }),
  );

  if (options.signal?.aborted) {
    throw new Error("Location search aborted.");
  }

  return retrievedResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
};

const geocodeSearch = async (
  query: string,
  context?: LocationSearchContext | null,
  options: LocationSearchOptions = {},
): Promise<LocationSearchResult[]> => {
  const params = new URLSearchParams({
    access_token: MAPBOX_PUBLIC_TOKEN,
    autocomplete: "true",
    language: "en",
    limit: "8",
    types: "address,poi,place,locality,neighborhood,district",
  });

  if (context) {
    params.set("proximity", `${context.longitude},${context.latitude}`);
  }

  return readLocationResults(
    `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?${params.toString()}`,
    `geocode-global-${toIdSlug(query)}`,
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

const dedupeResults = (results: LocationSearchResult[]) => {
  const seenProviderIds = new Set<string>();
  const seenLocationSignatures = new Set<string>();

  return results.filter((result) => {
    const providerKey = result.providerId ? `provider:${result.providerId}` : null;
    const locationSignature = [
      normalizeText(result.address || result.label || result.name),
      result.latitude.toFixed(5),
      result.longitude.toFixed(5),
    ].join(":");

    if (
      (providerKey && seenProviderIds.has(providerKey)) ||
      seenLocationSignatures.has(locationSignature)
    ) {
      return false;
    }

    if (providerKey) {
      seenProviderIds.add(providerKey);
    }
    seenLocationSignatures.add(locationSignature);
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
      const nameTokenMatches = queryTokens.filter((token) => normalizedName.includes(token)).length;
      const addressTokenMatches = queryTokens.filter((token) => normalizedAddress.includes(token)).length;
      const allTokensInName = queryTokens.length > 0 && nameTokenMatches === queryTokens.length;
      const allTokensInAddress = queryTokens.length > 0 && addressTokenMatches === queryTokens.length;
      const exactNameScore =
        normalizedName === normalizedQuery
          ? 520
          : normalizedName.startsWith(normalizedQuery)
            ? 240
            : normalizedName.includes(normalizedQuery)
              ? 185
              : 0;
      const tokenNameScore = allTokensInName ? 160 : nameTokenMatches * 36;
      const baseAddressScore =
        normalizedAddress === normalizedQuery
          ? 120
          : normalizedAddress.startsWith(normalizedQuery)
            ? 95
            : normalizedAddress.includes(normalizedQuery)
              ? 70
              : allTokensInAddress
                ? 58
                : addressTokenMatches * 12;
      const addressScore = normalizedName === normalizedQuery ? 0 : baseAddressScore;
      const providerScore = Math.max(0, 40 - (result.providerOrder ?? 40));
      const venueScore = result.isVenue ? 30 : 0;
      const curatedScore = result.id.startsWith("curated-") ? 80 : 0;
      const textScore = exactNameScore + tokenNameScore + addressScore;
      const distanceScore =
        context && textScore > 0 ? Math.max(0, 12 - distanceInKm(context, result) / 50) : 0;

      return curatedScore + textScore + providerScore + venueScore + distanceScore;
    };

    return score(second) - score(first);
  });
};

const collectRemoteResults = async (
  searches: Array<Promise<LocationSearchResult[]>>,
  signal?: AbortSignal,
): Promise<LocationSearchResult[]> => {
  const settledResults = await Promise.allSettled(searches);

  if (signal?.aborted) {
    throw new Error("Location search aborted.");
  }

  return settledResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
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

  const searchContext = getSearchContext(context);
  const curatedResults = curatedSearch(trimmedQuery, searchContext);
  const remoteResults = await collectRemoteResults(
    [
      searchBoxSuggest(trimmedQuery, searchContext, options),
      searchBoxForward(trimmedQuery, searchContext, options),
      geocodeSearch(trimmedQuery, searchContext, options),
    ],
    options.signal,
  );
  const rankedResults = rankResults(
    trimmedQuery,
    dedupeResults([...curatedResults, ...remoteResults]),
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
