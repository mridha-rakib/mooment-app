import { EVENT_CATEGORY_METADATA } from "@/constants/eventCategories";

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  EVENT_CATEGORY_METADATA.map((category) => [category.value, category.hexColor]),
);

export const DEFAULT_CATEGORY_COLOR = "#9CA3AF";

export const getCategoryColor = (category?: string | null): string =>
  (category ? CATEGORY_COLORS[category] : undefined) ?? DEFAULT_CATEGORY_COLOR;

export const getCategoryMarkerColor = ({
  category,
  categories,
  activeCategory,
}: {
  category?: string | null;
  categories?: readonly string[] | null;
  activeCategory?: string | null;
}): string => {
  const eventCategories = categories?.length ? categories : category ? [category] : [];
  const colorCategory = activeCategory && eventCategories.includes(activeCategory)
    ? activeCategory
    : eventCategories[0] ?? null;

  return getCategoryColor(colorCategory);
};
