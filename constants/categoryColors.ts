export const CATEGORY_COLORS: Record<string, string> = {
  "Music": "#A855F7",
  "Nightlife": "#EF4444",
  "Shows & Entertainment": "#E879F9",
  "Food & Drinks": "#F97316",
  "Dining Experiences": "#F59E0B",
  "Food Trucks": "#EA580C",
  "Social Meetups": "#3B82F6",
  "Social Pop-ups": "#06B6D4",
  "Sports & Outdoor": "#22C55E",
  "Games & Leisure": "#14B8A6",
  "Learning & Classes": "#6366F1",
  "Markets & Trade": "#B45309",
  "Street Performances": "#FF007F",
  "Religious & Spiritual": "#C084FC",
  "College Events": "#EAB308",
  "Premium Experiences": "#F5C518",
  "Family & Community": "#84CC16",
  "Other": "#9CA3AF",
};

export const DEFAULT_CATEGORY_COLOR = "#9CA3AF";

export const getCategoryColor = (category?: string | null): string =>
  (category ? CATEGORY_COLORS[category] : undefined) ?? DEFAULT_CATEGORY_COLOR;
