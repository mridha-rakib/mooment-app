import type { EventAgeRestriction } from "@/lib/events";

// EVT-010A — single canonical age-restriction label, used by every surface
// that displays an Event's age restriction (Feed, Search, Map, Event Detail).
// Pure and dependency-free (only a type-only import) so it's directly unit
// testable, matching app/lib/eventBannerValidation.ts / eventTicketPayload.ts /
// eventWizardSteps.ts.
//
// The canonical labels are exactly the three supported values — no alternate
// wording ("18+ only", "Ages 18+", etc.) on any surface.
//
// Fallback: any unknown/legacy/null/undefined value renders as "All Ages" —
// this reuses the exact fallback both pre-existing formatters
// (MapContainer.tsx's `formatAgeLimit`, AboutTab.tsx's `formatAgeLabel`)
// already used, so this is a consolidation of an existing, already-approved
// behavior, not a new policy.
export const formatEventAgeRestriction = (
  ageRestriction?: EventAgeRestriction | string | null,
): string => {
  if (ageRestriction === "18_plus") {
    return "18+";
  }

  if (ageRestriction === "21_plus") {
    return "21+";
  }

  return "All Ages";
};
