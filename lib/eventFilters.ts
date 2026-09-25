import { isEventCategory, type EventCategory } from "@/constants/eventCategories";
import type { EventAgeRestriction, EventMapQuery } from "@/lib/events";
import type { FeedAudience } from "@/lib/moments";

export type EventPriceFilter = "free" | "lt_10" | "lt_50" | "lt_100" | "gte_100";
export type EventTimePeriod = "morning" | "noon" | "evening" | "late_night" | "any";
export type EventLocationSource = "current" | "selected";

export type EventLocationFilter = {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  label: string;
  source: EventLocationSource;
  // Client-only presentation metadata (e.g. a short place name like "Barisal"
  // derived from the selected search result) — never sent to the backend.
  shortLabel?: string;
  // Whether the distance radius is an ACTIVE hard filter. The discovery centre
  // (coords + source) is separate from the distance restriction:
  //   false     → centre only; radiusMiles is a UI anchor, NO circular cutoff
  //   true      → radiusMiles is an active bounded (1–199) or broad (200+) filter
  //   undefined → LEGACY object created before this field existed: treat as true
  radiusEnabled?: boolean;
};

export type SharedEventFilters = {
  category?: EventCategory | null;
  ageRestriction?: EventAgeRestriction;
  priceFilter?: EventPriceFilter;
  selectedDate?: string | null;
  timePeriod?: EventTimePeriod;
  hashtags: string[];
  nearby: EventLocationFilter | null;
};

export type EventFilterRequestParams = EventMapQuery & {
  ageRestriction?: EventAgeRestriction;
  priceFilter?: EventPriceFilter;
  date?: string;
  timePeriod?: EventTimePeriod;
  timezoneOffsetMinutes?: number;
  hashtags?: string;
  audience?: FeedAudience;
  // Broad ("200+") discovery: the centre is passed as passive Smart Feed
  // ranking context only — never as a hard eligibility filter.
  rankingLatitude?: number;
  rankingLongitude?: number;
};

export type EventFilterApplyLocationDraft = {
  useCurrentLocation: boolean;
  selectedLocationLabel?: string | null;
  selectedLatitude?: number | null;
  selectedLongitude?: number | null;
};

export const MILES_TO_KM = 1.609344;
export const MIN_EVENT_RADIUS_MILES = 1;
export const MAX_EVENT_RADIUS_MILES = 200;
export const DEFAULT_EVENT_RADIUS_MILES = 75;

const isFiniteCoordinate = (
  latitude: unknown,
  longitude: unknown,
): latitude is number =>
  typeof latitude === "number" &&
  typeof longitude === "number" &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

export const normalizeEventRadiusMiles = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_EVENT_RADIUS_MILES;
  }

  return Math.min(MAX_EVENT_RADIUS_MILES, Math.max(MIN_EVENT_RADIUS_MILES, value));
};

export const isValidEventRadiusMiles = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= MIN_EVENT_RADIUS_MILES &&
  value <= MAX_EVENT_RADIUS_MILES;

// The slider's max endpoint (numeric sentinel 200) means BROAD SEARCH: a
// discovery centre with NO hard circular distance cutoff. 1–199 stay bounded
// exactly as before. This never widens the slider past 200 — only its meaning
// at the endpoint changes.
export const isBroadEventRadius = (radiusMiles: unknown): boolean =>
  typeof radiusMiles === "number" &&
  Number.isFinite(radiusMiles) &&
  radiusMiles >= MAX_EVENT_RADIUS_MILES;

// Display string for a radius value — "1 mile", "75 miles", "200+ miles".
export const formatEventRadiusLabel = (radiusMiles: number): string => {
  if (isBroadEventRadius(radiusMiles)) {
    return `${MAX_EVENT_RADIUS_MILES}+ miles`;
  }
  return `${radiusMiles} ${radiusMiles === 1 ? "mile" : "miles"}`;
};

// LOCKED product decision: the canonical radius-expansion checkpoints. The
// continuous slider is unaffected (still min 1, max 200, step 1) — these are
// used ONLY by the no-match "Increase radius" action and by major-step slider
// haptics.
export const EVENT_RADIUS_CHECKPOINTS = [1, 5, 10, 25, 50, 75, 100, 150, 200] as const;

// The next checkpoint strictly greater than the (normalized) current radius, or
// the broad max (200) when already at/above the last one. Deterministic — never
// current+25 / current*2 / anything dynamic.
export const getNextEventRadiusMiles = (currentRadius: unknown): number => {
  const current = normalizeEventRadiusMiles(currentRadius);
  for (const checkpoint of EVENT_RADIUS_CHECKPOINTS) {
    if (checkpoint > current) {
      return checkpoint;
    }
  }
  return MAX_EVENT_RADIUS_MILES;
};

// Major checkpoints that earn a light haptic tick when a drag crosses them.
// 1 (the slider minimum) is intentionally excluded.
const MAJOR_RADIUS_HAPTIC_CHECKPOINTS = [5, 10, 25, 50, 75, 100, 150, 200] as const;

// True when a 1-mile-precise drag update moves onto a major checkpoint it wasn't
// already on, or skips past one or more of them (a fast flick). Pure + local —
// the slider fires at most ONE haptic per update regardless of how many
// checkpoints were skipped, and never on a value that merely stays put.
export const crossesMajorRadiusCheckpoint = (
  previousRadius: number,
  nextRadius: number,
): boolean => {
  if (previousRadius === nextRadius) {
    return false;
  }
  const low = Math.min(previousRadius, nextRadius);
  const high = Math.max(previousRadius, nextRadius);
  return MAJOR_RADIUS_HAPTIC_CHECKPOINTS.some(
    (checkpoint) =>
      (checkpoint > low && checkpoint < high) ||
      (checkpoint === nextRadius && checkpoint !== previousRadius),
  );
};

export const isValidEventLocationFilter = (
  filter: EventLocationFilter | null | undefined,
): filter is EventLocationFilter =>
  Boolean(
    filter &&
      isFiniteCoordinate(filter.latitude, filter.longitude) &&
      isValidEventRadiusMiles(filter.radiusMiles),
  );

// Is the distance radius an ACTIVE hard filter? A legacy `nearby` object (no
// `radiusEnabled` field) predates the discovery-centre / distance-filter split
// and always meant "active radius" — so `undefined` is treated as `true`. Only
// an explicit `false` means "centre only, no circular cutoff".
export const isEventRadiusEnabled = (
  filter: EventLocationFilter | null | undefined,
): boolean => (filter ? filter.radiusEnabled !== false : false);

// A valid discovery centre with an ACTIVE bounded radius (1–199). Broad ("200+")
// and radius-inactive centres both fall back to the viewport / no-cutoff path.
export const hasBoundedRadiusFilter = (filters: SharedEventFilters): boolean =>
  isValidEventLocationFilter(filters.nearby) &&
  isEventRadiusEnabled(filters.nearby) &&
  !isBroadEventRadius(filters.nearby.radiusMiles);

// A valid discovery centre with an explicitly-active radius (bounded OR broad).
export const hasActiveRadiusFilter = (filters: SharedEventFilters): boolean =>
  isValidEventLocationFilter(filters.nearby) && isEventRadiusEnabled(filters.nearby);

export const getEventLocationFilterKey = (
  filter: EventLocationFilter | null | undefined,
): string | null => {
  if (!isValidEventLocationFilter(filter)) {
    return null;
  }

  return [
    filter.source,
    filter.latitude.toFixed(6),
    filter.longitude.toFixed(6),
    filter.radiusMiles.toFixed(3),
  ].join(":");
};

export const hasValidSelectedEventFilterLocation = (
  draft: EventFilterApplyLocationDraft,
): boolean =>
  Boolean(
    draft.selectedLocationLabel?.trim() &&
      isFiniteCoordinate(draft.selectedLatitude, draft.selectedLongitude),
  );

export const canApplyEventFilters = (
  draft: EventFilterApplyLocationDraft,
): boolean =>
  draft.useCurrentLocation || hasValidSelectedEventFilterLocation(draft);

export const toggleSingleSelectFilterValue = <T extends string>(
  currentValue: T | null | undefined,
  nextValue: T,
): T | null => (currentValue === nextValue ? null : nextValue);

export const createEmptyEventFilters = (): SharedEventFilters => ({
  category: null,
  hashtags: [],
  nearby: null,
});

// "Reset" / "Clear filters" drop every non-location Event criterion and return
// distance to the approved default anchor (75) with the radius INACTIVE, while
// PRESERVING any valid discovery centre — current OR searched ("selected").
// It never mutates OS permission, device coordinates, or global live-sharing.
// The dedicated searched-location × (a different action) is still the only way
// to swap a searched centre back to Current Location.
export const resetEventFiltersPreservingDiscoveryCenter = (
  filters: SharedEventFilters,
): SharedEventFilters => {
  const base = createEmptyEventFilters();

  if (isValidEventLocationFilter(filters.nearby)) {
    return {
      ...base,
      nearby: {
        ...filters.nearby,
        radiusMiles: DEFAULT_EVENT_RADIUS_MILES,
        radiusEnabled: false,
      },
    };
  }

  return base;
};

/**
 * @deprecated Batch 2D renamed this to
 * `resetEventFiltersPreservingDiscoveryCenter` and, per approved product, it now
 * also preserves a searched ("selected") centre. Kept as an alias so external
 * callers / tests keep compiling.
 */
export const clearEventFiltersPreservingCurrentLocation = resetEventFiltersPreservingDiscoveryCenter;

export const normalizeEventCategoryFilter = (value: unknown): EventCategory | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return isEventCategory(trimmed) ? trimmed : null;
};

export const mergeCategoryIntoEventFilters = (
  filters: SharedEventFilters,
  category: unknown,
): SharedEventFilters => {
  const normalizedCategory = normalizeEventCategoryFilter(category);

  if (!normalizedCategory) {
    return filters;
  }

  if (filters.category === normalizedCategory) {
    return filters;
  }

  return {
    ...filters,
    category: normalizedCategory,
  };
};

export const setCategoryInEventFilters = (
  filters: SharedEventFilters,
  category: unknown,
): SharedEventFilters => {
  const nextCategory = normalizeEventCategoryFilter(category);

  if ((filters.category ?? null) === nextCategory) {
    return filters;
  }

  return {
    ...filters,
    category: nextCategory,
  };
};

export const mergeVisibleEventFilters = (
  currentFilters: SharedEventFilters,
  visibleFilters: SharedEventFilters,
  options: { clearCategory?: boolean } = {},
): SharedEventFilters => ({
  ...visibleFilters,
  category: options.clearCategory
    ? null
    : normalizeEventCategoryFilter(visibleFilters.category) ?? normalizeEventCategoryFilter(currentFilters.category),
});

export const confirmVisibleEventFilters = (
  currentFilters: SharedEventFilters,
  visibleFilters: SharedEventFilters,
  options: { clearCategory?: boolean; resetAll?: boolean } = {},
): SharedEventFilters => (
  options.resetAll
    ? createEmptyEventFilters()
    : mergeVisibleEventFilters(currentFilters, visibleFilters, options)
);

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const parseLocalDateKey = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const hasActiveEventFilters = (filters: SharedEventFilters): boolean =>
  Boolean(
    filters.ageRestriction ||
      normalizeEventCategoryFilter(filters.category) ||
      filters.priceFilter ||
      filters.selectedDate ||
      (filters.timePeriod && filters.timePeriod !== "any") ||
      filters.hashtags.length > 0 ||
      // A discovery centre by itself is NOT a restrictive Event filter — only an
      // ACTIVE distance radius counts (bounded or broad; legacy nearby = active).
      hasActiveRadiusFilter(filters),
  );

// Display-only labels for a compact "applied criteria" summary. These mirror the
// FilterModal option strings; they change nothing about matching semantics.
const AGE_SUMMARY_LABEL: Record<EventAgeRestriction, string> = {
  all_ages: "All Ages",
  "18_plus": "18+",
  "21_plus": "21+",
};
const PRICE_SUMMARY_LABEL: Record<EventPriceFilter, string> = {
  free: "Free",
  lt_10: "< $10",
  lt_50: "< $50",
  lt_100: "< $100",
  gte_100: "$100+",
};
const TIME_SUMMARY_LABEL: Record<Exclude<EventTimePeriod, "any">, string> = {
  morning: "Morning",
  noon: "Noon",
  evening: "Evening",
  late_night: "Late Night",
};
const SUMMARY_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const formatSummaryDate = (dateKey: string): string | null => {
  const date = parseLocalDateKey(dateKey);
  if (!date) {
    return null;
  }
  return `${SUMMARY_MONTHS[date.getMonth()]} ${date.getDate()}`;
};

// Pure, display-only. Produces a compact "21+ · Free · Evening · #music · 25 mi ·
// New York" style line from the AUTHORITATIVE applied filters. Returns "" when
// nothing is active. It never invents state and never changes matching rules.
export const summarizeEventFilters = (filters: SharedEventFilters): string => {
  const parts: string[] = [];

  const category = normalizeEventCategoryFilter(filters.category);
  if (category) {
    parts.push(category);
  }
  if (filters.ageRestriction) {
    parts.push(AGE_SUMMARY_LABEL[filters.ageRestriction]);
  }
  if (filters.priceFilter) {
    parts.push(PRICE_SUMMARY_LABEL[filters.priceFilter]);
  }
  if (filters.selectedDate) {
    const label = formatSummaryDate(filters.selectedDate);
    if (label) {
      parts.push(label);
    }
  }
  if (filters.timePeriod && filters.timePeriod !== "any") {
    parts.push(TIME_SUMMARY_LABEL[filters.timePeriod]);
  }
  for (const tag of filters.hashtags) {
    if (tag) {
      parts.push(`#${tag}`);
    }
  }
  if (isValidEventLocationFilter(filters.nearby)) {
    parts.push(
      !isEventRadiusEnabled(filters.nearby)
        ? "Any distance"
        : isBroadEventRadius(filters.nearby.radiusMiles)
          ? `${MAX_EVENT_RADIUS_MILES}+ mi`
          : `${Math.round(filters.nearby.radiusMiles)} mi`,
    );
    if (filters.nearby.source === "current") {
      parts.push("Current Location");
    } else {
      const place = filters.nearby.shortLabel?.trim() || filters.nearby.label?.trim();
      if (place) {
        parts.push(place);
      }
    }
  }

  return parts.join(" · ");
};

export const buildEventFilterRequestParams = (
  filters: SharedEventFilters,
  options: { includeLocation?: boolean; limit?: number; audience?: FeedAudience } = {},
): EventFilterRequestParams => {
  const params: EventFilterRequestParams = {};
  const category = normalizeEventCategoryFilter(filters.category);

  if (category) {
    params.category = category;
  }

  if (filters.ageRestriction) {
    params.ageRestriction = filters.ageRestriction;
  }

  if (filters.priceFilter) {
    params.priceFilter = filters.priceFilter;
  }

  if (filters.selectedDate) {
    params.date = filters.selectedDate;
  }

  if (filters.timePeriod && filters.timePeriod !== "any") {
    params.timePeriod = filters.timePeriod;
  }

  if (filters.selectedDate || (filters.timePeriod && filters.timePeriod !== "any")) {
    const date = filters.selectedDate ? parseLocalDateKey(filters.selectedDate) : new Date();
    params.timezoneOffsetMinutes = (date ?? new Date()).getTimezoneOffset();
  }

  if (filters.hashtags.length > 0) {
    params.hashtags = filters.hashtags.join(",");
  }

  if (options.includeLocation !== false && isValidEventLocationFilter(filters.nearby)) {
    const nearby = filters.nearby;
    if (!isEventRadiusEnabled(nearby) || isBroadEventRadius(nearby.radiusMiles)) {
      // Radius INACTIVE ("Any distance") or broad ("200+"): NO
      // latitude/longitude/radiusKm — those are the only things the backend
      // turns into a bounding box + haversine cutoff. The centre is kept purely
      // as Smart Feed ranking context (already-supported; no scorer/weight/
      // precedence change). The internal 75-mile anchor never leaks as a filter.
      params.rankingLatitude = nearby.latitude;
      params.rankingLongitude = nearby.longitude;
    } else {
      // Explicitly-active bounded radius (1–199): unchanged circular filter.
      params.latitude = nearby.latitude;
      params.longitude = nearby.longitude;
      params.radiusKm = nearby.radiusMiles * MILES_TO_KM;
    }
  }

  if (options.limit !== undefined) {
    params.limit = options.limit;
  }

  if (options.audience) {
    params.audience = options.audience;
  }

  return params;
};
