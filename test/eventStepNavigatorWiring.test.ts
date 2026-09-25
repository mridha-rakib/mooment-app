import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-002 — wiring checks against the five main Create/Edit Event wizard
// screens plus the three child (non-wizard) screens. These screens can't be
// mounted under the plain `bun test` runner (no RN component harness in this
// repo — see the other event*.test.ts files), so these are source-text
// guards, not runtime proof of on-screen behavior; app/test/eventWizardSteps.test.ts
// covers the actual eligibility/reachability logic at runtime instead.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const basics = read("app/create-event/index.tsx");
const details = read("app/create-event/step-2.tsx");
const location = read("app/create-event/step-3.tsx");
const tickets = read("app/create-event/step-4.tsx");
const privacy = read("app/create-event/step-5.tsx");

const mainSteps = { basics, details, location, tickets, privacy };

// ── 1-5: navigator exists on all five main steps ────────────────────────────

for (const [name, source] of Object.entries(mainSteps)) {
  test(`EVT-002: ${name} screen imports and renders CreateEventStepNavigator`, () => {
    assert.match(source, /import CreateEventStepNavigator from '@\/components\/create-event\/CreateEventStepNavigator'/);
    assert.match(source, /<CreateEventStepNavigator stepStates={stepStates} onStepPress={handleStepNavigatorPress} \/>/);
  });

  test(`EVT-002: ${name} screen's old static "Step N / N out of 5" text is gone`, () => {
    assert.doesNotMatch(source, /out of 5/);
  });
}

// ── 6/7: labels + current-step identifiability (component-level) ───────────

const navigatorComponent = read("components/create-event/CreateEventStepNavigator.tsx");

test("EVT-002: navigator renders each step's label from shared step metadata", () => {
  assert.match(navigatorComponent, /EVENT_WIZARD_STEPS\.map/);
  assert.match(navigatorComponent, /\{step\.label\}/);
});

test("EVT-002: navigator visually distinguishes the current step", () => {
  assert.match(navigatorComponent, /isCurrent = state === 'current'/);
  assert.match(navigatorComponent, /accessibilityState={{ selected: isCurrent, disabled: isGuarded }}/);
});

test("EVT-002: guarded steps are not actionable (disabled, non-tab accessibility role)", () => {
  assert.match(navigatorComponent, /isGuarded = state === 'guarded'/);
  assert.match(navigatorComponent, /disabled={isGuarded}/);
  assert.match(navigatorComponent, /accessibilityRole={isGuarded \? 'text' : 'tab'}/);
});

// ── 8: current-step tap is a safe no-op ─────────────────────────────────────

const currentStepGuard: Record<string, string> = {
  basics: "if (step === 'basics') return;",
  details: "if (step === 'details') return;",
  location: "if (step === 'location') return;",
  tickets: "if (step === 'tickets') return;",
  privacy: "if (step === 'privacy') return;",
};

for (const [name, source] of Object.entries(mainSteps)) {
  test(`EVT-002: ${name} screen's navigator handler no-ops when the tapped step is already current`, () => {
    assert.ok(source.includes(currentStepGuard[name]), `${name} is missing its own current-step guard`);
  });
}

// ── 16-24: local state is flushed (not discarded) before a navigator jump ──

test("EVT-002: Basics flushes name/description/banner (incl. bannerContentType) before navigating away", () => {
  const handler = basics.slice(
    basics.indexOf("const handleStepNavigatorPress"),
    basics.indexOf("const handleSaveDraft"),
  );
  const persistIndex = handler.indexOf("persistStepOne();");
  const navigateIndex = handler.indexOf("router.replace(getEventWizardStepPath(step));");

  assert.ok(persistIndex >= 0 && navigateIndex > persistIndex, "must persist Basics before navigating");
});

test("EVT-002: Details flushes categories/age/schedule before navigating away", () => {
  const handler = details.slice(
    details.indexOf("const handleStepNavigatorPress"),
    details.indexOf("const handleSaveDraft"),
  );
  const persistIndex = handler.indexOf("persistStepTwo();");
  const navigateIndex = handler.indexOf("router.replace(getEventWizardStepPath(step));");

  assert.ok(persistIndex >= 0 && navigateIndex > persistIndex, "must persist Details before navigating");
});

test("EVT-002: Location flushes venue/address/additional info before navigating away", () => {
  const handler = location.slice(
    location.indexOf("const handleStepNavigatorPress"),
    location.indexOf("const handleSaveDraft"),
  );
  const persistIndex = handler.indexOf("persistStepThree();");
  const navigateIndex = handler.indexOf("router.replace(getEventWizardStepPath(step));");

  assert.ok(persistIndex >= 0 && navigateIndex > persistIndex, "must persist Location before navigating");
});

test("EVT-002: bannerImageDisplay preservation logic (eventDraftStore setStepOne) is untouched by this batch", () => {
  const draftStoreSource = read("stores/eventDraftStore.ts");
  const setStepOne = draftStoreSource.slice(
    draftStoreSource.indexOf("setStepOne: ({"),
    draftStoreSource.indexOf("setStepTwo: ({"),
  );

  assert.match(setStepOne, /bannerImageDisplay !== undefined/);
  assert.match(setStepOne, /state\.bannerImageDisplay/);
});

// ── 25/26: navigator tap must not call the backend or create a draft ───────

for (const [name, source] of Object.entries(mainSteps)) {
  test(`EVT-002: ${name} screen's navigator handler never calls saveDraft()/publish()`, () => {
    const handler = source.slice(
      source.indexOf("const handleStepNavigatorPress"),
      source.indexOf("const handleStepNavigatorPress") + source.slice(source.indexOf("const handleStepNavigatorPress")).indexOf("\n  };") + 5,
    );

    assert.ok(handler.length > 0, `${name}'s handleStepNavigatorPress was not found`);
    assert.doesNotMatch(handler, /saveDraft\(\)/);
    assert.doesNotMatch(handler, /publishEvent\(\)/);
    assert.doesNotMatch(handler, /\bawait\b/);
  });
}

// ── 27-29: child screens remain child navigation, no navigator rendered ────

const childScreens = {
  "location-picker": read("app/create-event/location-picker.tsx"),
  "ticket-details": read("app/create-event/ticket-details.tsx"),
  "ticket-preview": read("app/create-event/ticket-preview.tsx"),
};

for (const [name, source] of Object.entries(childScreens)) {
  test(`EVT-002: ${name} does not render the step navigator (remains a child screen, not a wizard step)`, () => {
    assert.doesNotMatch(source, /CreateEventStepNavigator/);
  });
}

// ── 30/31: Edit Event / existing-banner hydration is read from the store ───

test("EVT-002: every screen's step-eligibility computation reads sibling-step fields from the store (survives Edit Event hydration)", () => {
  for (const [name, source] of Object.entries(mainSteps)) {
    assert.match(
      source,
      /getEventWizardStepValidity\(\{/,
      `${name} must compute step validity from getEventWizardStepValidity`,
    );
  }
});

test("EVT-002: Basics passes bannerImageUri (not a re-upload flag) into eligibility — an existing banner needs no re-selection", () => {
  const call = basics.slice(basics.indexOf("const stepValidity = getEventWizardStepValidity({"), basics.indexOf("});", basics.indexOf("const stepValidity")));
  assert.match(call, /bannerImageUri: bannerImage/);
});
