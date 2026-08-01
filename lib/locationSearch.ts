import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";
import {
  getLocationSearchContext,
  getLocationSearchProximityParam,
  type LocationSearchContext,
} from "@/lib/locationSearchContext";

export { getLocationSearchProximityParam, type LocationSearchContext } from "@/lib/locationSearchContext";

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
  mapboxPlaceId?: string;
  formattedAddress?: string;
  addressLine1?: string;
  neighborhood?: string;
  district?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  postalCode?: string;
  providerResultType?: string;
  providerOrder?: number;
  distanceKm?: number;
};

export type LocationSearchPurpose = "general" | "area";

type LocationSearchOptions = {
  signal?: AbortSignal;
  purpose?: LocationSearchPurpose;
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
  context?: {
    id?: string;
    text?: string;
    short_code?: string;
  }[];
  properties?: {
    address?: string;
    category?: string;
    feature_type?: string;
    full_address?: string;
    name?: string;
    name_preferred?: string;
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
      neighborhood?: {
        name?: string;
      };
      district?: {
        name?: string;
      };
      region?: {
        name?: string;
        region_code?: string;
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
  suggestions?: {
    feature_type?: string;
    mapbox_id?: string;
  }[];
};

const MAPBOX_GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const MAPBOX_SEARCHBOX_FORWARD_URL = "https://api.mapbox.com/search/searchbox/v1/forward";
const MAPBOX_SEARCHBOX_SUGGEST_URL = "https://api.mapbox.com/search/searchbox/v1/suggest";
const MAPBOX_SEARCHBOX_RETRIEVE_URL = "https://api.mapbox.com/search/searchbox/v1/retrieve";
const LOCATION_SEARCH_CACHE_LIMIT = 50;
const LOCATION_SEARCH_TIMEOUT_MS = 8000;
const REMOTE_RESULT_LIMIT = "10";
const DEFAULT_LOCATION_SEARCH_PURPOSE: LocationSearchPurpose = "general";
const AREA_SEARCH_FEATURE_TYPES = [
  "place",
  "region",
  "district",
  "locality",
  "neighborhood",
  "country",
  "postcode",
] as const;
const AREA_SEARCH_TYPES_PARAM = AREA_SEARCH_FEATURE_TYPES.join(",");
const AREA_SEARCH_TYPE_PRIORITY = new Map<string, number>(
  AREA_SEARCH_FEATURE_TYPES.map((type, index) => [type, index]),
);

const locationSearchCache = new Map<string, LocationSearchResult[]>();

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

const normalizeProviderResultType = (value?: string | null) => cleanDisplayText(value).toLowerCase();

const getAreaSearchTypePriority = (value?: string | null) => {
  const normalizedType = normalizeProviderResultType(value);

  return AREA_SEARCH_TYPE_PRIORITY.get(normalizedType) ?? null;
};

const isAreaSearchType = (value?: string | null) => getAreaSearchTypePriority(value) !== null;

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

const toTitleCase = (value: string) =>
  value
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const isFiniteCoordinate = (latitude: unknown, longitude: unknown) =>
  typeof latitude === "number" &&
  typeof longitude === "number" &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const getSearchCacheKey = (
  query: string,
  purpose: LocationSearchPurpose,
  context?: LocationSearchContext | null,
) => {
  const normalizedQuery = normalizeText(query);
  const searchContext = getLocationSearchContext(context);
  const normalizedContext = searchContext
    ? [
        searchContext.latitude.toFixed(3),
        searchContext.longitude.toFixed(3),
        searchContext.countryCode ?? "any-country",
      ].join("|")
    : "global";

  return `worldwide-v5::${purpose}::provider::${normalizedQuery}::${normalizedContext}`;
};

const applySearchContextParams = (params: URLSearchParams, context?: LocationSearchContext | null) => {
  const searchContext = getLocationSearchContext(context);

  if (!searchContext) {
    return;
  }

  const proximity = getLocationSearchProximityParam(searchContext);

  if (proximity) {
    params.set("proximity", proximity);
  }
};

const applySearchPurposeParams = (params: URLSearchParams, purpose: LocationSearchPurpose) => {
  if (purpose !== "area") {
    return;
  }

  params.set("types", AREA_SEARCH_TYPES_PARAM);
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

const getFeatureNeighborhood = (feature: MapboxFeature) =>
  feature.properties?.context?.neighborhood?.name || getFeatureContextValue(feature, "neighborhood.") || "";

const getFeatureDistrict = (feature: MapboxFeature) =>
  feature.properties?.context?.district?.name || getFeatureContextValue(feature, "district.") || "";

const getFeatureRegion = (feature: MapboxFeature) =>
  feature.properties?.context?.region?.name || getFeatureContextValue(feature, "region.") || "";

const getFeatureRegionCode = (feature: MapboxFeature) =>
  feature.properties?.context?.region?.region_code ||
  feature.context?.find((item) => item.id?.startsWith("region."))?.short_code ||
  "";

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

  const name = cleanDisplayText(
    feature.properties?.name_preferred ||
      feature.properties?.name ||
      feature.text ||
      "Selected location",
  );
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
  const neighborhood = getFeatureNeighborhood(feature);
  const district = getFeatureDistrict(feature);
  const region = getFeatureRegion(feature);
  const regionCode = getFeatureRegionCode(feature);
  const postalCode = getFeaturePostalCode(feature);
  const providerId = feature.id ?? feature.properties?.mapbox_id;

  return {
    address,
    formattedAddress: rawAddress || label || undefined,
    addressLine1: cleanDisplayText(feature.properties?.address) || undefined,
    id: providerId ?? fallbackId,
    isVenue,
    label,
    latitude,
    longitude,
    matchLabel: isVenue ? toTitleCase(category) || "Venue" : getFeaturePlaceName(feature) || undefined,
    name,
    providerId,
    mapboxPlaceId: providerId,
    neighborhood: neighborhood || undefined,
    district: district || undefined,
    country: country || undefined,
    countryCode,
    region: region || undefined,
    regionCode: regionCode || undefined,
    city: city || undefined,
    postalCode: postalCode || undefined,
    providerResultType: featureType || undefined,
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
    limit: REMOTE_RESULT_LIMIT,
    q: query,
  });

  applySearchPurposeParams(params, options.purpose ?? DEFAULT_LOCATION_SEARCH_PURPOSE);
  applySearchContextParams(params, context);

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
    limit: REMOTE_RESULT_LIMIT,
    q: query,
    session_token: sessionToken,
  });

  const purpose = options.purpose ?? DEFAULT_LOCATION_SEARCH_PURPOSE;
  applySearchPurposeParams(params, purpose);
  applySearchContextParams(params, context);

  const response = await fetchWithTimeout(`${MAPBOX_SEARCHBOX_SUGGEST_URL}?${params.toString()}`, options.signal);

  if (!response.ok) {
    throw new Error("Unable to search locations right now.");
  }

  const data = (await response.json()) as MapboxSuggestResponse;
  const suggestions = (data.suggestions ?? []).filter(
    (suggestion) => Boolean(suggestion.mapbox_id) && (purpose !== "area" || isAreaSearchType(suggestion.feature_type)),
  );
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
    fuzzyMatch: "true",
    language: "en",
    limit: REMOTE_RESULT_LIMIT,
    types:
      (options.purpose ?? DEFAULT_LOCATION_SEARCH_PURPOSE) === "area"
        ? AREA_SEARCH_TYPES_PARAM
        : "address,poi,place,locality,neighborhood,district",
  });

  applySearchContextParams(params, context);

  return readLocationResults(
    `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?${params.toString()}`,
    `geocode-global-${toIdSlug(query)}`,
    options.signal,
  );
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

const rankAreaSearchResults = (results: LocationSearchResult[]) =>
  results
    .map((result, index) => ({
      index,
      priority: getAreaSearchTypePriority(result.providerResultType),
      result,
    }))
    .filter((item): item is { index: number; priority: number; result: LocationSearchResult } => item.priority !== null)
    .sort((first, second) => {
      const priorityDelta = first.priority - second.priority;

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const providerOrderDelta =
        (first.result.providerOrder ?? first.index) - (second.result.providerOrder ?? second.index);

      return providerOrderDelta || first.index - second.index;
    })
    .map((item) => item.result);

const rankSearchResults = (
  results: LocationSearchResult[],
  purpose: LocationSearchPurpose,
) => (purpose === "area" ? rankAreaSearchResults(results) : results);

const collectRemoteResults = async (
  searches: Promise<LocationSearchResult[]>[],
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

  const purpose = options.purpose ?? DEFAULT_LOCATION_SEARCH_PURPOSE;
  const cacheKey = getSearchCacheKey(trimmedQuery, purpose, context);
  const cachedResults = locationSearchCache.get(cacheKey);

  if (cachedResults) {
    return [...cachedResults];
  }

  const searchContext = getLocationSearchContext(context);
  const remoteResults = await collectRemoteResults(
    [
      searchBoxSuggest(trimmedQuery, searchContext, options),
      searchBoxForward(trimmedQuery, searchContext, options),
      geocodeSearch(trimmedQuery, searchContext, options),
    ],
    options.signal,
  );
  const finalResults = ensureUniqueResultIds(
    rankSearchResults(dedupeResults(remoteResults), purpose).slice(0, 8),
  );
  const finalResultsWithDistance = finalResults.map((result) => ({
    ...result,
    distanceKm: searchContext ? distanceInKm(searchContext, result) : undefined,
  }));

  storeSearchResults(cacheKey, finalResultsWithDistance);

  return finalResultsWithDistance;
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
