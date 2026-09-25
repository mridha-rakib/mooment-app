# EVT-002 Implementation Report — Create Event Tappable Step Navigator

Scope: EVT-002 only. EVT-004 and the narrow EVT-005 behaviors from the previous batch were preserved exactly (verified by re-running their tests, unchanged). EVT-006 categories were not touched. No backend file was changed.

---

## 1. Exact production files changed

**New**
- `app/lib/eventWizardSteps.ts` — pure step metadata, per-step validity, and reachability/eligibility logic (zero React Native dependency, directly unit-testable).
- `app/components/create-event/CreateEventStepNavigator.tsx` — the presentational navigator component.

**Modified** (each: added the navigator import/render, a `stepStates` computation, and a `handleStepNavigatorPress` handler; no other logic touched)
- `app/app/create-event/index.tsx` (Basics)
- `app/app/create-event/step-2.tsx` (Details)
- `app/app/create-event/step-3.tsx` (Location)
- `app/app/create-event/step-4.tsx` (Tickets)
- `app/app/create-event/step-5.tsx` (Privacy)

**Not touched**: `location-picker.tsx`, `ticket-details.tsx`, `ticket-preview.tsx`, `_layout.tsx`, `eventDraftStore.ts` (no store change was needed — see §4), any backend file, any category/taxonomy file, `eventBanner.ts`/`eventBannerValidation.ts` (EVT-005), or the EVT-004 copy strings.

## 2. Exact tests added/updated

**Added**
- `app/test/eventWizardSteps.test.ts` — 16 runtime tests of the pure eligibility/reachability logic (per-step validity, forward/backward reachability rules, the banner-required and category-count gates, key-indexed state mapping).
- `app/test/eventStepNavigatorWiring.test.ts` — 32 source-text wiring tests (this repo's established convention for screens that can't be mounted under `bun test`) covering: navigator present on all 5 screens and the old static text gone, label/current/guarded rendering in the component, each screen's current-step no-op guard, flush-before-navigate ordering for Basics/Details/Location, `bannerImageDisplay` preservation untouched, no `saveDraft()`/`publish()`/`await` inside any navigator handler, the three child screens never render the navigator, and every screen computing eligibility from the store (Edit Event hydration path).

**Updated**: none. No existing test file's assertions were changed for this batch.

## 3. Whether any backend file changed

**No.** This was verified to be achievable as a pure frontend navigation change — the banner-required rule, category rules, schedule rules, location rules, and ticket rules are all already enforced by existing frontend schemas/store logic and the (previous-batch) backend authority; the navigator only decides which *screen* the user may land on, using data those existing rules already produce. No backend file was opened for editing.

## 4. Navigator component architecture

- `app/lib/eventWizardSteps.ts` (pure logic): `EVENT_WIZARD_STEPS` (5 `{key, label, path}` descriptors), `isEventWizardBasicsStepValid` / `isEventWizardDetailsStepValid` / `isEventWizardLocationStepValid` / `isEventWizardTicketsStepValid` / `isEventWizardPrivacyStepValid` (presence-based per-step checks), `getEventWizardStepValidity` (builds the 5-boolean array from a store-shaped snapshot), `getEventWizardStepStates`/`getEventWizardStepStatesByKey` (turns validity + current index into `current`/`eligible`/`guarded` per step), `getEventWizardStepPath`/`getEventWizardStepIndex`.
- `app/components/create-event/CreateEventStepNavigator.tsx` (presentational only): receives `stepStates` (a `Record<key, state>`) and `onStepPress`; renders 5 compact labels with a small underline indicator; contains zero business/validation logic.
- Each screen: computes a full 5-step validity array (its OWN step from live local component state, every other step from the store's already-persisted values — see §7), converts it to `stepStates` via `getEventWizardStepStatesByKey`, and defines `handleStepNavigatorPress` (no-op on same-step, else flush + `router.replace`).

No new store slice, no Redux, no route-param form state, no form framework, no new dependency — `eventDraftStore.ts` itself was not modified.

## 5. Exact labels

`Basics`, `Details`, `Location`, `Tickets`, `Privacy` — in that order, sourced from the single `EVENT_WIZARD_STEPS` array so every screen renders identically.

## 6. Current-step behavior

The navigator marks the current step both visually (bold text + colored underline via `colors.primary`, vs. `colors.textSecondary`/`colors.border` for others) and via `accessibilityState={{ selected: isCurrent }}`. Tapping the current step still fires `onStepPress`, but each screen's handler's first line is `if (step === '<thisStep>') return;` — no flush, no navigation, no remount.

## 7. Completion/eligibility derivation

Per-step validity is presence-based, matching each step's own required-field rules without duplicating their full real-time validation apparatus (e.g. step-2's past-date/ongoing-edit logic stays exactly where it is and is unchanged):
- **Basics**: name, description, and banner all present (mirrors `createEventStepOneSchema` — including the EVT-005 banner-required rule).
- **Details**: 1–3 categories and both a start and an end present.
- **Location**: venue, address, or searchLabel present (mirrors `createEventStepThreeSchema`).
- **Tickets**: always valid — no minimum-ticket-count rule exists today.
- **Privacy**: always valid — always carries a valid default.

For the screen currently being edited, this validity is computed from **live local component state** (e.g. Basics reads `name`/`description`/`bannerImage`, not the store, since those haven't been flushed yet). For every other step, it's computed from the **store's already-persisted values** — which is exactly why this works correctly for a freshly-loaded Edit/draft session (§19) without requiring the user to revisit every earlier screen first.

## 8. Guarded-step behavior

A step is `guarded` when it is ahead of the current step (forward direction) AND any step strictly before it (0..i-1) is currently invalid. Guarded steps are rendered `disabled`, with `accessibilityRole="text"` (not `"tab"`) so they don't announce as actionable, and their `TouchableOpacity.onPress` never fires — a guarded step cannot be tapped at all, not "tapped and then rejected."

## 9. How current local state is persisted before a jump

Each screen's `handleStepNavigatorPress` calls that screen's own existing **unvalidated** flush function before navigating — the same function `handleSaveDraft`/`handleNext` already use to write current field values into the store, called here with no arguments (so it uses whatever is currently typed, valid or not):
- Basics → `persistStepOne()`
- Details → `persistStepTwo()`
- Location → `persistStepThree()`
- Tickets → nothing to flush (ticket mutations already write straight to the store via `saveTicket`/`removeTicket`)
- Privacy → nothing to flush (`handlePrivacyChange` already writes to the store synchronously on every tap)

None of these persist calls touch the network — they only update the in-memory Zustand store.

## 10. Backward-jump behavior

Unconditionally allowed regardless of the current step's own validity (`index < currentIndex` always returns `"eligible"` in `getEventWizardStepStates`), so a user can always go back to fix an earlier step. Local state is flushed first (§9), so nothing entered on the step being left is lost.

## 11. Forward-jump behavior

Allowed to step `i` only if every step before it (0..i-1) is currently valid (`index <= firstInvalid`) — reaching the very next not-yet-complete step is allowed (mirrors the existing "Next" button), but skipping past an invalid step to something further ahead is not.

## 12. Proof missing banner cannot be bypassed

`app/test/eventWizardSteps.test.ts`, test "Basics invalid because the banner is missing: Details+ are guarded (EVT-005 cannot be bypassed)": with `bannerImageUri: null` and everything else valid, `getEventWizardStepStates` returns `guarded` for Details, Location, Tickets, and Privacy — all four. `isEventWizardBasicsStepValid` requires `bannerImageUri` truthy alongside name/description (same precondition the EVT-005 Save-Draft/publish gate itself uses).

## 13. Proof Details validation cannot be bypassed

Test "forward jump blocked when an intermediate step is invalid (Basics valid, Details invalid, tap Location)": with `categoryCount: 0` (Details invalid) and Basics otherwise valid, `getEventWizardStepStates(validity, 0)[2]` (Location) is `"guarded"`.

## 14. Proof navigator taps do not backend-save a draft

`app/test/eventStepNavigatorWiring.test.ts`'s "navigator handler never calls saveDraft()/publish()" test slices each screen's `handleStepNavigatorPress` function body out of the source and asserts it contains no `saveDraft()`, no `publishEvent()`, and — since every network call in this codebase is `await`ed — no `await` keyword at all. All 5 screens pass.

## 15. Proof no duplicate draft is created

A direct consequence of §14: since a navigator tap makes zero network calls, it cannot invoke `saveEventDraft`/the backend's create-vs-update branching at all, so it structurally cannot create a duplicate draft. `draftSaveQueue`, `draftId` tracking, and the POST-vs-PATCH logic in `eventDraftStore.ts` are completely untouched (that file was not modified in this batch).

## 16. Child-screen behavior

`location-picker.tsx`, `ticket-details.tsx`, and `ticket-preview.tsx` were not modified. Test-confirmed (`eventStepNavigatorWiring.test.ts`) that none of the three contain any reference to `CreateEventStepNavigator`. Their existing Back/return behavior (`router.back()`/explicit param-based returns into step-3/step-4) is unchanged.

## 17. Create Event behavior

A brand-new session starts with an empty store (all fields blank/default), so on Basics every other step's validity is `false` (no categories, no schedule, no location) — Details/Location/Tickets/Privacy are all `guarded` from the start, exactly as before this feature existed (the linear Next-only flow already enforced this implicitly; now it's also visible and consistently enforced by the navigator).

## 18. Existing Draft behavior

Reopening a draft calls `loadFromEvent()` (unchanged), which populates the store's `name`/`description`/`bannerImageKey`/`categories`/`scheduledAt`/`endAt`/`location`/`tickets`/`privacy` from the persisted record. Because every non-current step's validity is read from those same store fields, a partially-complete legacy draft correctly shows exactly the steps its actual saved data supports as eligible — no re-visiting of already-valid screens is required to "unlock" the navigator.

## 19. Edit Published Event behavior

Same mechanism as §18 — `isEditingPublishedEvent`/`isExistingEventSession` are unaffected by this batch, and the navigator has no special-casing for edit-vs-create; it only ever looks at the current field values, whatever their origin.

## 20. EVT-004 regression results

`app/test/eventBasicsCopyAndBannerRequired.test.ts` (all EVT-004 copy assertions): **10/10 pass**, unchanged from the previous batch. "Event name", "Tell people what to expect", and "Upload one event banner image - JPEG or PNG." are all still present; both legacy strings are still absent.

## 21. EVT-005 regression results

`app/test/eventBanner.test.ts` (pure banner validation/consistency logic): **11/11 pass**. `app/test/eventBasicsCopyAndBannerRequired.test.ts`'s banner-required-for-Save-Draft assertions: still passing (part of the same 10/10 above). JPEG/PNG allow-list, 15 MiB cap, invalid-replacement preservation, and banner-key/fallback consistency logic in `app/lib/eventBanner.ts`/`eventBannerValidation.ts` were not touched by this batch.

## 22. Proof bannerImageDisplay remains preserved

`eventStepNavigatorWiring.test.ts`'s "bannerImageDisplay preservation logic ... is untouched by this batch" test re-asserts the exact same two conditions (`bannerImageDisplay !== undefined` / `state.bannerImageDisplay`) inside `eventDraftStore.ts`'s `setStepOne` that the previous batch's fix introduced — confirming that fix is still in place and that this batch made no edit to `eventDraftStore.ts` at all.

## 23. Proof categories remained untouched

`app/constants/eventCategories.ts`, `admin/src/shared/eventCategories.ts`, `api/src/modules/events/event.interface.ts`, `event.model.ts`, and `api/test/event-taxonomy.test.ts` were not opened for editing at any point in this batch. `eventWizardSteps.ts`'s Details-validity check operates purely on a category **count** (`categoryCount: number`), with no import of the category constants/taxonomy at all — test-asserted explicitly ("category taxonomy is not touched by this module").

## 24. New EVT-002 test results

- `app/test/eventWizardSteps.test.ts`: **16/16 pass**.
- `app/test/eventStepNavigatorWiring.test.ts`: **32/32 pass**.

## 25. Relevant regression results

- `eventWizardSessionMode.test.ts`, `eventCreateTimezoneWiring.test.ts`, `eventStepTwoOngoingEdit.test.ts`, `eventStepThreeLocation.test.ts`, `draftPreviewPrivacySelector.test.ts`, `editFeatureWiring.test.ts`, plus the previous batch's `eventBanner.test.ts`/`eventBasicsCopyAndBannerRequired.test.ts`, run together with this batch's two new files: **154/154 pass**.
- Full frontend suite (`bun test`, 150 files): **1905 pass / 11 fail / 1 error** — the pass count rose by exactly 48 (the 16 + 32 new tests) relative to the previous batch's 1857, and a name-by-name diff of every failing test shows the **exact same 10 named failures + 1 error** as before this batch, with only timing differing. Zero new failures were introduced. (Those 10 failures + 1 error remain the same pre-existing, unrelated ones documented in the previous report — `RepostFeedCard`/attendee-list/video-playback/map-marker-glow/stale `getEventBadgeStatus` signature/notification-settings — none reference Create Event, banners, or the navigator.)

## 26. TypeScript result

`tsc --noEmit -p tsconfig.json`: the same 2 pre-existing, unrelated errors as the previous batch (`lib/momentPostMapper.ts`, `test/smartFeedRankingLocation.test.ts`) plus the same pre-existing test-config error (`test/mapPreviewSlideLayoutStability.test.ts`). **Zero errors in any file this batch touched** — confirmed by grepping the full error output for `create-event`, `eventWizardSteps`, `CreateEventStepNavigator`, and `eventBanner` and finding no matches. (One real type error was caught and fixed during development: `router.replace(path)` needed `path` typed as expo-router's `Href`, not a bare `string`, to satisfy its typed-routes union — fixed in `eventWizardSteps.ts` via a type-only `Href` import.)

## 27. Lint result / exact environment blocker

Attempted `npx eslint` against every file this batch touched. Blocked by the same pre-existing, unrelated cause as the previous batch: `'...\node_modules\.bin\eslint.exe' was blocked by your organization's Device Guard policy.` This is an OS/organization-level restriction on this machine, not a code or config issue, and was not worked around. TypeScript's clean result (§26) is the strongest automated signal available in its place.

## 28. Pre-existing failures, separately

Unchanged from the previous batch's report: the same 10 named frontend test failures + 1 error, all traced to source belonging to other components (`RepostFeedCard`, attendee-list privacy copy, video-playback release/reload logic, map-marker-glow constants, a stale `getEventBadgeStatus(event, nowMs)` signature, a notification-settings test) and none referencing Create Event, banners, drafts, or the navigator. Backend MongoDB/ffmpeg-dependent failures and the stale `event-taxonomy.test.ts` import were not touched or re-investigated, per instruction, since this batch made no backend change.

## 29. Final EVT-002 completion status

**Complete**, per the stated success condition: a compact step navigator exists on all five main wizard steps with the exact labels Basics/Details/Location/Tickets/Privacy; the current step is visually and programmatically identifiable; eligible steps are tappable and guarded steps are not; navigation cannot bypass the required-banner rule or the Details/category/schedule/location rules (test-proven); all Event form data survives both backward and forward jumps because it is flushed via each screen's existing, unmodified persist function before navigating; navigator taps make zero network calls (no implicit Save Draft, no duplicate drafts); the three child screens remain plain child navigation; Edit Event and existing-draft sessions are handled correctly because eligibility is derived from the store, not from "has this screen been visited this session"; and EVT-004, EVT-005, and EVT-006 all remain exactly as the previous batch left them, test-verified. No backend change, no category change, no banner-rule change, no redesign, and no new dependency were introduced.
