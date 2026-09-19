// EVT-002 — pure step metadata + eligibility logic for the Create/Edit Event
// step navigator. Kept separate from app/stores/eventDraftStore.ts and each
// step screen so it can be unit tested directly and reused identically by
// every screen that renders the navigator.
//
// Eligibility is deliberately presence-based (does the step have the data it
// requires at all), not a re-run of each step's full real-time validation
// (e.g. step-2's past-date/ongoing-edit rules). Those richer checks remain
// exactly where they already are (each step's own Next/Save handlers) and
// are unchanged by this file — this module only answers "can the user safely
// land on this step right now," not "is the wizard ready to publish."
//
// `Href` is a type-only import (erased at compile time — safe for the plain
// `bun test` runner, which cannot parse expo-router's runtime react-native
// dependency chain, same reasoning as app/lib/eventBannerValidation.ts).
import type { Href } from "expo-router";

export type EventWizardStepKey = "basics" | "details" | "location" | "tickets" | "privacy";

export type EventWizardStepState = "current" | "eligible" | "guarded";

export type EventWizardStepDescriptor = {
  key: EventWizardStepKey;
  label: string;
  path: Href;
};

export const EVENT_WIZARD_STEPS: readonly EventWizardStepDescriptor[] = [
  { key: "basics", label: "Basics", path: "/create-event" },
  { key: "details", label: "Details", path: "/create-event/step-2" },
  { key: "location", label: "Location", path: "/create-event/step-3" },
  { key: "tickets", label: "Tickets", path: "/create-event/step-4" },
  { key: "privacy", label: "Privacy", path: "/create-event/step-5" },
];

export const getEventWizardStepIndex = (key: EventWizardStepKey): number =>
  EVENT_WIZARD_STEPS.findIndex((step) => step.key === key);

export const getEventWizardStepPath = (key: EventWizardStepKey): Href =>
  EVENT_WIZARD_STEPS[getEventWizardStepIndex(key)].path;

// ── Per-step validity (presence-based; mirrors each step's own required-field
// rules without duplicating their full validation apparatus) ───────────────

export const isEventWizardBasicsStepValid = (input: {
  name: string;
  description: string;
  bannerImageUri: string | null;
}): boolean => Boolean(input.name.trim() && input.description.trim() && input.bannerImageUri);

export const isEventWizardDetailsStepValid = (input: {
  categoryCount: number;
  hasStart: boolean;
  hasEnd: boolean;
}): boolean =>
  input.categoryCount >= 1 && input.categoryCount <= 3 && input.hasStart && input.hasEnd;

export const isEventWizardLocationStepValid = (input: {
  venue?: string | null;
  address?: string | null;
  searchLabel?: string | null;
}): boolean => Boolean(input.venue?.trim() || input.address?.trim() || input.searchLabel?.trim());

// Tickets have no required minimum today (a ticket-less event is a valid
// draft/publish target) — always eligible once reached. Do not add a
// requirement here; that would be a business-rule change outside EVT-002.
export const isEventWizardTicketsStepValid = (): boolean => true;

// Privacy always carries a valid default ("public") — never actually
// "invalid". Always eligible once reached.
export const isEventWizardPrivacyStepValid = (): boolean => true;

export type EventWizardDraftSnapshot = {
  name: string;
  description: string;
  bannerImageUri: string | null;
  categoryCount: number;
  hasStart: boolean;
  hasEnd: boolean;
  location: { venue?: string | null; address?: string | null; searchLabel?: string | null };
};

/**
 * Validity for all 5 steps, computed from the store's persisted (already
 * flushed) values. The caller overrides the entry for whichever step is
 * currently being edited with a live-local-state computation, since that
 * screen's latest keystrokes haven't been flushed to the store yet.
 */
export const getEventWizardStepValidity = (draft: EventWizardDraftSnapshot): boolean[] => [
  isEventWizardBasicsStepValid({
    name: draft.name,
    description: draft.description,
    bannerImageUri: draft.bannerImageUri,
  }),
  isEventWizardDetailsStepValid({
    categoryCount: draft.categoryCount,
    hasStart: draft.hasStart,
    hasEnd: draft.hasEnd,
  }),
  isEventWizardLocationStepValid(draft.location),
  isEventWizardTicketsStepValid(),
  isEventWizardPrivacyStepValid(),
];

/**
 * Backward jumps are always allowed (the user must be able to go fix an
 * earlier step). A forward jump to step `i` is allowed when every step
 * BEFORE it (0..i-1) is currently valid — reaching the first not-yet-valid
 * step itself is fine (that mirrors the existing "Next" button, which always
 * lets you advance into an empty next step); what's blocked is SKIPPING PAST
 * an invalid step to something further ahead. This is what stops a
 * banner-less Basics (or any other invalid earlier step) from being
 * bypassed by tapping ahead in the navigator.
 */
export const getEventWizardStepStates = (
  validity: readonly boolean[],
  currentIndex: number,
): EventWizardStepState[] => {
  let firstInvalid = validity.findIndex((valid) => !valid);
  if (firstInvalid === -1) firstInvalid = validity.length;

  return validity.map((_, index) => {
    if (index === currentIndex) return "current";
    if (index < currentIndex) return "eligible";
    return index <= firstInvalid ? "eligible" : "guarded";
  });
};

export const getEventWizardStepStatesByKey = (
  validity: readonly boolean[],
  currentKey: EventWizardStepKey,
): Record<EventWizardStepKey, EventWizardStepState> => {
  const currentIndex = getEventWizardStepIndex(currentKey);
  const states = getEventWizardStepStates(validity, currentIndex);

  return EVENT_WIZARD_STEPS.reduce<Record<EventWizardStepKey, EventWizardStepState>>(
    (acc, step, index) => {
      acc[step.key] = states[index];
      return acc;
    },
    {} as Record<EventWizardStepKey, EventWizardStepState>,
  );
};
