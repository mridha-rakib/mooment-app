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

export const getEventDetailsCategoryDestination = (
  source: unknown,
  category: unknown,
): EventCategoryDestination | null => {
  const normalizedCategory = normalizeEventCategoryFilter(category);

  if (!normalizedCategory) {
    return null;
  }

  if (normalizeEventDetailsSource(source) === "map") {
    return {
      pathname: "/(tabs)/home",
      params: { view: "map", category: normalizedCategory },
    };
  }

  return {
    pathname: "/discover-screen/event-category",
    params: { category: normalizedCategory },
  };
};
