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
};

export const MILES_TO_KM = 1.609344;

export const createEmptyEventFilters = (): SharedEventFilters => ({
  category: null,
  hashtags: [],
  nearby: null,
});

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
      filters.nearby,
  );

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

  if (options.includeLocation !== false && filters.nearby) {
    params.latitude = filters.nearby.latitude;
    params.longitude = filters.nearby.longitude;
    params.radiusKm = filters.nearby.radiusMiles * MILES_TO_KM;
  }

  if (options.limit !== undefined) {
    params.limit = options.limit;
  }

  if (options.audience) {
    params.audience = options.audience;
  }

  return params;
};
