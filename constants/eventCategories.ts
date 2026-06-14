export const EVENT_CATEGORIES = [
  "Music",
  "Nightlife",
  "Shows & Entertainment",
  "Food & Drinks",
  "Dining Experiences",
  "Food Trucks",
  "Social Meetups",
  "Social Pop-ups",
  "Sports & Outdoor",
  "Games & Leisure",
  "Learning & Classes",
  "Markets & Trade",
  "Street Performances",
  "Religious & Spiritual",
  "College Events",
  "Premium Experiences",
  "Family & Community",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const isEventCategory = (value: unknown): value is EventCategory =>
  typeof value === "string" && (EVENT_CATEGORIES as readonly string[]).includes(value);
