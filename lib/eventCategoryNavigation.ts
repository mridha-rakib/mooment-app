import type { EventCategory } from "@/constants/eventCategories";
import { normalizeEventCategoryFilter } from "@/lib/eventFilters";

export type EventDetailsSource = "feed" | "map";

export type EventCategoryDestination =
  | {
      pathname: "/discover-screen/event-category";
      params: { category: EventCategory };
    }
  | {
      pathname: "/(tabs)/home";
      params: { view: "map"; category: EventCategory };
    };

export const normalizeEventDetailsSource = (value: unknown): EventDetailsSource =>
  value === "map" ? "map" : "feed";

export const getEventCategoryFeedDestination = (
  category: unknown,
): Extract<EventCategoryDestination, { pathname: "/discover-screen/event-category" }> | null => {
  const normalizedCategory = normalizeEventCategoryFilter(category);

  if (!normalizedCategory) {
    return null;
  }

  return {
    pathname: "/discover-screen/event-category",
    params: { category: normalizedCategory },
  };
};

export const getEventCategoryMapDestination = (
  category: unknown,
): Extract<EventCategoryDestination, { pathname: "/(tabs)/home" }> | null => {
  const normalizedCategory = normalizeEventCategoryFilter(category);

  if (!normalizedCategory) {
    return null;
  }

  return {
    pathname: "/(tabs)/home",
    params: { view: "map", category: normalizedCategory },
  };
};
