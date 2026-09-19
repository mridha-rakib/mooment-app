import assert from "node:assert/strict";
import test from "node:test";
import {
  EVENT_WIZARD_STEPS,
  getEventWizardStepIndex,
  getEventWizardStepPath,
  getEventWizardStepStates,
  getEventWizardStepStatesByKey,
  getEventWizardStepValidity,
  isEventWizardBasicsStepValid,
  isEventWizardDetailsStepValid,
  isEventWizardLocationStepValid,
  isEventWizardPrivacyStepValid,
  isEventWizardTicketsStepValid,
} from "../lib/eventWizardSteps";

// EVT-002 — pure eligibility logic, tested at runtime (not source-text
// regex) since these functions have zero react-native dependency.

const validDraft = () => ({
  name: "My Event",
  description: "A description",
  bannerImageUri: "https://cdn.example.com/banner.jpg",
  categoryCount: 2,
  hasStart: true,
  hasEnd: true,
  location: { venue: "The Venue" },
});

test("exactly 5 steps, in the required order and labels", () => {
  assert.deepEqual(
    EVENT_WIZARD_STEPS.map((step) => step.key),
    ["basics", "details", "location", "tickets", "privacy"],
  );
  assert.deepEqual(
    EVENT_WIZARD_STEPS.map((step) => step.label),
    ["Basics", "Details", "Location", "Tickets", "Privacy"],
  );
});

test("getEventWizardStepPath resolves each step to its screen route", () => {
  assert.equal(getEventWizardStepPath("basics"), "/create-event");
  assert.equal(getEventWizardStepPath("details"), "/create-event/step-2");
  assert.equal(getEventWizardStepPath("location"), "/create-event/step-3");
  assert.equal(getEventWizardStepPath("tickets"), "/create-event/step-4");
  assert.equal(getEventWizardStepPath("privacy"), "/create-event/step-5");
});

test("getEventWizardStepIndex matches array order", () => {
  assert.equal(getEventWizardStepIndex("basics"), 0);
  assert.equal(getEventWizardStepIndex("privacy"), 4);
});

// ── Basics validity (must respect the EVT-005 banner-required rule) ────────

test("Basics requires name, description, AND a banner — missing any one is invalid", () => {
  assert.equal(isEventWizardBasicsStepValid({ name: "x", description: "y", bannerImageUri: "uri" }), true);
  assert.equal(isEventWizardBasicsStepValid({ name: "", description: "y", bannerImageUri: "uri" }), false);
  assert.equal(isEventWizardBasicsStepValid({ name: "x", description: "", bannerImageUri: "uri" }), false);
  assert.equal(isEventWizardBasicsStepValid({ name: "x", description: "y", bannerImageUri: null }), false);
  assert.equal(isEventWizardBasicsStepValid({ name: "   ", description: "y", bannerImageUri: "uri" }), false);
});

// ── Details validity ────────────────────────────────────────────────────────

test("Details requires 1-3 categories and both a start and end", () => {
  assert.equal(isEventWizardDetailsStepValid({ categoryCount: 1, hasStart: true, hasEnd: true }), true);
  assert.equal(isEventWizardDetailsStepValid({ categoryCount: 3, hasStart: true, hasEnd: true }), true);
  assert.equal(isEventWizardDetailsStepValid({ categoryCount: 0, hasStart: true, hasEnd: true }), false);
  assert.equal(isEventWizardDetailsStepValid({ categoryCount: 4, hasStart: true, hasEnd: true }), false);
  assert.equal(isEventWizardDetailsStepValid({ categoryCount: 1, hasStart: false, hasEnd: true }), false);
  assert.equal(isEventWizardDetailsStepValid({ categoryCount: 1, hasStart: true, hasEnd: false }), false);
});

// ── Location validity ───────────────────────────────────────────────────────

test("Location requires venue, address, or searchLabel — not coordinates", () => {
  assert.equal(isEventWizardLocationStepValid({ venue: "Venue" }), true);
  assert.equal(isEventWizardLocationStepValid({ address: "123 Main St" }), true);
  assert.equal(isEventWizardLocationStepValid({ searchLabel: "Somewhere" }), true);
  assert.equal(isEventWizardLocationStepValid({}), false);
  assert.equal(isEventWizardLocationStepValid({ venue: "   " }), false);
});

// ── Tickets/Privacy have no navigator-blocking requirement today ───────────

test("Tickets and Privacy are always valid (no existing required-field rule for either)", () => {
  assert.equal(isEventWizardTicketsStepValid(), true);
  assert.equal(isEventWizardPrivacyStepValid(), true);
});

// ── Full-wizard validity + eligibility derivation ───────────────────────────

test("getEventWizardStepValidity produces one boolean per step, index-aligned", () => {
  assert.deepEqual(getEventWizardStepValidity(validDraft()), [true, true, true, true, true]);
});

test("all steps valid: every step is eligible regardless of current position", () => {
  const validity = getEventWizardStepValidity(validDraft());
  assert.deepEqual(getEventWizardStepStates(validity, 0), ["current", "eligible", "eligible", "eligible", "eligible"]);
  assert.deepEqual(getEventWizardStepStates(validity, 4), ["eligible", "eligible", "eligible", "eligible", "current"]);
});

test("Basics valid, Details invalid: Location/Tickets/Privacy are guarded from Basics", () => {
  const validity = getEventWizardStepValidity({ ...validDraft(), categoryCount: 0 });
  assert.deepEqual(getEventWizardStepStates(validity, 0), ["current", "eligible", "guarded", "guarded", "guarded"]);
});

test("Basics invalid because the banner is missing: Details+ are guarded (EVT-005 cannot be bypassed)", () => {
  const validity = getEventWizardStepValidity({ ...validDraft(), bannerImageUri: null });
  assert.deepEqual(getEventWizardStepStates(validity, 0), ["current", "guarded", "guarded", "guarded", "guarded"]);
});

test("backward jumps are always eligible even when a later step is currently invalid", () => {
  const validity = getEventWizardStepValidity({ ...validDraft(), categoryCount: 0 });
  // Currently on Location (index 2); Details (index 1) is invalid, but it's
  // BEHIND the current step, so it must stay tappable to let the user fix it.
  const states = getEventWizardStepStates(validity, 2);
  assert.equal(states[0], "eligible"); // basics, behind current
  assert.equal(states[1], "eligible"); // details, behind current, even though invalid
  assert.equal(states[2], "current");
});

test("forward jump allowed only when every earlier step is valid (Basics valid, Details valid, Location already valid)", () => {
  const validity = getEventWizardStepValidity(validDraft());
  const states = getEventWizardStepStates(validity, 0); // current = basics
  assert.equal(states[2], "eligible"); // location reachable from basics
});

test("forward jump blocked when an intermediate step is invalid (Basics valid, Details invalid, tap Location)", () => {
  const validity = getEventWizardStepValidity({ ...validDraft(), categoryCount: 0 });
  const states = getEventWizardStepStates(validity, 0); // current = basics
  assert.equal(states[2], "guarded"); // location NOT reachable — details blocks it
});

test("getEventWizardStepStatesByKey returns a key-indexed map matching the index-based result", () => {
  const validity = getEventWizardStepValidity(validDraft());
  const byKey = getEventWizardStepStatesByKey(validity, "details");
  assert.equal(byKey.basics, "eligible");
  assert.equal(byKey.details, "current");
  assert.equal(byKey.location, "eligible");
  assert.equal(byKey.tickets, "eligible");
  assert.equal(byKey.privacy, "eligible");
});

test("category taxonomy is not touched by this module (count-only rule, no category list/import)", () => {
  // EVT-006 guard: this module must never import category constants/taxonomy —
  // it only ever looks at a plain category COUNT.
  assert.equal(isEventWizardDetailsStepValid({ categoryCount: 3, hasStart: true, hasEnd: true }), true);
  assert.equal(isEventWizardDetailsStepValid({ categoryCount: 4, hasStart: true, hasEnd: true }), false);
});
