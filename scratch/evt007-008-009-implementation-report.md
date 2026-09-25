# Implementation Report — EVT-007 Layout, EVT-008 Past-Start Fix + Display Consistency, EVT-009 Regression Coverage

Scope: three narrowly-scoped goals as specified. EVT-010 was not touched. All previously-completed work (EVT-002, EVT-004, EVT-005, the ticket-payload `salesEnded`/`availableCount` fix) was re-verified intact.

---

## 1. Exact production files changed

**Frontend**
- `app/app/create-event/step-2.tsx` — EVT-007: reordered the date/time controls into Start row / End row; fixed the time-value text to use the same safe-width/truncation style as the date-value text.
- `app/app/event-screen/event.tsx` — EVT-008: Share sheet `dateTimeLabel` and the reward-claim "Expires" line now use `formatEventTimeDisplay` (Event-local) instead of raw `toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` (device-local).

**Backend**
- `api/src/modules/events/event.service.ts` — EVT-008: new `assertPublishableScheduleNotInPast` helper, wired into the two "this Event has never been live before" branches of `publish()` (brand-new event, and first-time publish of an existing draft). **Deliberately not** wired into the "re-publish/edit an already-published event" branch, nor into `updateEvent()` — both are unchanged, preserving EVT-009.

**EVT-009: zero production changes.** Per the task's explicit stop condition, the new regression test was written first; it passed against the existing, unmodified `assertOngoingEventScheduleUpdateAllowed` guard, proving no bug exists. No production code for EVT-009 was touched.

## 2. Exact test files added/updated

**Added**
- `api/test/event-publish-schedule.test.ts` — 16 runtime tests (mocked-repository `EventService`, matching the established convention) covering the new past-start rule: new-event future/past, draft-first-publish future/past (direct-API-bypass proof), Save Draft unaffected (new + update), end-before-start still rejected (via the Zod schema directly, since the service itself only re-checks ordering inside timezone-conversion tiers), editing an already-published not-yet-started event unaffected, active-event end-time-only edit unaffected, and four boundary/timezone-resolution tests proving the comparison is instant-vs-instant (including one driven through real coordinate-based timezone resolution).
- `app/test/eventStepTwoDateTimeLayout.test.ts` — 8 source-text tests (this repo's established convention for screens that can't be mounted under `bun test`) proving the row grouping, source order, text-truncation parity, unchanged handlers/bindings, unchanged pickers, and EVT-002 navigator presence.
- `app/test/eventShareAndRewardTimeDisplay.test.ts` — 6 source-text tests proving the Share sheet and reward-claim call sites now use `formatEventTimeDisplay` with `event.timezone`, no longer use device-local formatting, and that the primary `eventTimeModel` usage is unchanged.

**Updated**
- `api/test/event-hashtags.test.ts` — one fixture's `scheduledAt`/`endAt` moved from a now-past 2026-09-01 date to a safely-future 2030-09-01 date (the only pre-existing fixture broken by the new past-start rule; a fixture-only fix, no assertion weakened — see §9/§36).
- `api/test/event-ticket-management.test.ts` — 2 new tests appended to the existing ongoing-event test block: an active event's venue change that resolves to a *different* timezone (rejected — proves start stays immutable), and one that resolves to the *same* timezone (succeeds normally, proving the rejection above is specifically about the zone changing).

---

## EVT-007 — Date/Time Layout

## 3. Old date/time layout

Two rows grouped by field type: Row 1 = [Start Date, End Date], Row 2 = [Start Time, End Time] (confirmed by direct re-read before editing, `app/app/create-event/step-2.tsx:563-640` prior to this batch).

## 4. New Start/End grouping

Row 1 = [Start Date, Start Time], Row 2 = [End Date, End Time] — matching the requirement exactly. Only the JSX position of the four control blocks moved; every prop, handler, state binding, and style reference within each block is byte-identical to before (verified by the "existing handlers/field bindings are unchanged" test, §10).

## 5. Small-screen protection

No hardcoded widths were introduced or removed — both columns in every row still use `dateTimeColumn: { flex: 1 }` (unchanged style), so each control continues to take exactly half the row's width regardless of screen size. No new width constraints were added anywhere.

## 6. Time text overflow fix

The two time-value `Text` elements previously used `styles.selectorText` (`fontSize: 15`, no `flex`, no `numberOfLines`) — the one style in this screen with no truncation guard. Both now use `styles.compactSelectorText` (`flex: 1, fontSize: 13`) plus `numberOfLines={1}`, exactly matching the guard the date-value `Text` elements already had. This is a real containment fix, not cosmetic: without `flex: 1` on the `Text`, `numberOfLines` alone does not reliably prevent an RN `Text` from pushing past its row's bounds in a `flexDirection: row` layout with a fixed-width sibling (the icon) — `flex: 1` is what actually bounds the text to the available space so truncation can take effect. The displayed time *value* itself (`formatTime(...)` output) is completely unchanged — only the containing `Text`'s style/prop changed.

## 7. Accessibility/source order

Source/DOM order is now: Start Date → Start Time → End Date → End Time — exactly the logical order requested. Verified by a dedicated test (`eventStepTwoDateTimeLayout.test.ts`, "Start controls appear before End controls in source order"). No new keyboard-navigation system was introduced (none existed before, and none was needed — these are `Pressable`s, not `TextInput`s, per the original audit's own finding).

## 8. EVT-007 test results

`app/test/eventStepTwoDateTimeLayout.test.ts`: **8/8 pass.**

---

## EVT-008 — Past-Start Fix + Display Consistency

## 9. Exact root cause of the past-start gap

Confirmed by direct re-reading before editing: `EventService.publish()` had no check comparing the normalized `scheduledAt` against the current time for a brand-new event, in either the no-`eventId` branch or the first-time-publish-of-a-draft branch. `event.validation.ts` has no `now`-comparison refine on `scheduledAt` anywhere. The only frontend gate (`getEventStepTwoScheduleErrors`'s `!isOngoingEdit` branch) runs solely from the wizard's Next/Save&Exit handlers — never from Save Draft, and never from the actual first-publish action (`event-screen/event.tsx`'s `handlePublishDraft`, which calls `buildPublishPayloadFromEvent` with no date check at all before this fix) — so it provided no protection against a direct API call to either publish endpoint.

## 10. Exact frontend validation fix

**Not added as a new UI validation this batch**, and this is a deliberate, correct decision, not an omission: the existing frontend gate (`getEventStepTwoScheduleErrors`, unchanged) already gives immediate feedback the moment a user tries to advance past the Details step with a past start, for the normal wizard flow. Adding a second, separate frontend check at the actual publish button (`handlePublishDraft` in `event.tsx`) was considered but not implemented, because: (a) the backend fix (§11) is the authoritative, always-correct layer regardless of how a request reaches it, satisfying the task's own instruction that frontend validation is for "immediate UX feedback" but "must NOT be the only protection," and (b) `buildPublishPayloadFromEvent` throwing a clear `Error` (caught by the existing `Alert.alert("Unable to publish event", ...)` handler) already surfaces the backend's rejection message cleanly to the user without needing duplicate client-side date-comparison logic — adding one would mean maintaining two copies of "compare against now," with the attendant risk of them drifting. The backend's error message (`"Event start date and time cannot be in the past."`) is shown verbatim via the existing error-alert path.

## 11. Exact backend authoritative fix

New private method on `EventService` (`api/src/modules/events/event.service.ts`, right after `assertPublishableBanner`):
```ts
private assertPublishableScheduleNotInPast(scheduledAt: Date | null | undefined): void {
  if (!scheduledAt) return;
  if (scheduledAt.getTime() < this.getServerNow().getTime()) {
    throw new AppError("Event start date and time cannot be in the past.", httpStatus.BAD_REQUEST);
  }
}
```
Called from exactly two places in `publish()`:
1. The `eventId` + `!existingEvent || existingEvent.status === "draft"` branch (first-time publish of an existing draft) — called with `normalizedPayload.scheduledAt` right before `publishDraftByIdForUser`.
2. The no-`eventId` branch (brand-new event, no prior draft) — called right before `eventRepository.create`.

**Deliberately NOT called** in the `eventId` + `existingEvent.status !== "draft"` branch (re-publishing/editing an already-published event's schedule via `publish()`) — that is an active/existing-event edit, not a "new Event," and is correctly left to the pre-existing, untouched `assertOngoingEventScheduleUpdateAllowed`/general schedule-ordering checks that already govern that path. `updateEvent()` was not touched at all.

`scheduledAt` passed in is always `normalizedPayload.scheduledAt` — the value *after* `normalizePublishPayload`/`applyEventTimeZone` has already run, i.e. the fully-resolved, post-timezone-conversion absolute UTC instant. This satisfies the task's explicit requirement that the comparison happen "after any required Event-local → UTC normalization."

## 12. Proof direct API cannot bypass it

`api/test/event-publish-schedule.test.ts`, test "first-time publish of an existing draft with a past start is rejected (direct-API bypass of the frontend gate is also blocked)": calls `EventService.publish()` directly (bypassing any frontend code entirely, exactly simulating a raw API call) with a past `scheduledAt` and asserts a 400 rejection before the repository is ever touched (`publishDraftByIdForUser` mocked to throw if called — confirmed never called). Two more tests do the same for the no-`eventId` brand-new-event path and for a venue-local-wall-clock payload that only *resolves* to a past instant after real timezone conversion (proving the check can't be fooled by a "future-looking" raw literal).

## 13. Save Draft semantics

**Unaffected, confirmed by direct proof, not just by omission.** Two new tests ("Save Draft with a past schedule is unaffected by the new publish-only rule," new-draft and update-draft variants) call `EventService.saveDraft()` directly with a past `scheduledAt` and assert it succeeds, with the past value passed through to the repository unchanged. `saveDraft()` itself was not modified in this batch.

## 14. Proof active Event edits were not broken

Two layers of proof:
- **New test in `event-publish-schedule.test.ts`**: "active Event (already started) end-time-only edit via publish() is not broken by the new past-start rule" — a live event with a historical (1-hour-ago) start, edited only on the end time via `publish()`'s already-published branch, succeeds and reaches the repository with the extended end time.
- **New tests in `event-ticket-management.test.ts`** (the file with the existing, unmodified `assertOngoingEventScheduleUpdateAllowed` tests): the venue/timezone-change regression test (§27) also proves `updateEvent()` — the actual production path for active-event edits — is completely unaffected, since it was never touched.

## 15. End-before-start regression result

Confirmed unchanged and still correctly enforced. Since `EventService.publish()` itself only re-validates ordering *inside* the timezone-conversion tiers of `applyEventTimeZone` (which don't fire for a request with no coordinates/no existing zone), the authoritative check for a plain `scheduledAt`/`endAt` pair is the Zod schema (`validateEventDateRange`, unchanged, wired into `publishBody`). Three new tests exercise `eventValidation.publish.safeParse(...)` directly (mirroring `event-taxonomy.test.ts`'s own convention of testing schema rules directly): `end === start` rejected, `end < start` rejected, `end > start` accepted. All three pass, confirming this pre-existing rule was not disturbed by adding the new past-start check alongside it.

## 16. UTC/timezone comparison logic

Instant-vs-instant only, never a string or local-wall-clock comparison — `scheduledAt.getTime() < this.getServerNow().getTime()`, both sides always `Date` objects. Directly proven by the "past-start comparison operates on the normalized absolute instant, not a raw/local string" test and its two coordinate-driven companions (§12): a venue-local wall-clock time that *looks* future when read as a raw literal, but resolves (via the real, unmodified `applyEventTimeZone`/`eventLocalPartsToInstant` machinery) to an instant before "now," is correctly rejected — and the reverse (looks past-ish as a raw literal, resolves to future) is correctly accepted. `getServerNow()` is the same injectable clock hook already used throughout the test suite (`() => new Date(Date.now())` by default, overridden to a fixed `now` in every test), so the comparison is fully deterministic and testable, with no invented grace period — confirmed by a dedicated "1 second before NOW is rejected" boundary test.

## 17. DST gap regression result

Unchanged, confirmed by re-running `api/test/event-create-timezone.test.ts` in full (11/11 pass, no modification made to `event-timezone.ts` in this batch). No new DST-specific test was added, per the task's own instruction not to duplicate already-strong coverage — the new past-start rule operates purely on the already-resolved `scheduledAt`, after DST resolution has already happened, so it has no interaction with DST logic to test.

## 18. DST fold regression result

Same as above — `event-create-timezone.test.ts` unchanged and green; `event-timezone.ts` untouched.

## 19. Share sheet Event-local fix

`app/app/event-screen/event.tsx`'s Share sheet `dateTimeLabel` (previously `new Date(event.scheduledAt).toLocaleString([], {...})`, device-local) now builds `` `${primaryDateShortText}, ${primaryTimeText}` `` from `formatEventTimeDisplay({ scheduledAt: event.scheduledAt, timezone: event.timezone })` — the exact same helper Feed/Map/Event Detail already use, producing an Event-local result. Format shape is deliberately kept close to the original (`"Sep 20, 7:00 PM"`-style) rather than swapping in the helper's fuller `primaryDateTimeText` (which adds a weekday and zone abbreviation) — per the task's instruction not to change unrelated share copy/layout, only the timezone source.

## 20. Reward claim Event-local fix

The reward-claim "Expires" row (previously raw `toLocaleDateString`/`toLocaleTimeString`, device-local) now builds `` `${primaryDateText} • ${primaryTimeText}` `` from the same `formatEventTimeDisplay` helper, fed `event?.timezone`. The `"Date TBA"` fallback for a missing/unparseable date is preserved exactly as before — no new fallback was invented. Only the formatting call changed; reward eligibility, claiming, release, the reward data model, and Event Window logic were not touched (confirmed by diff — the surrounding ~15 lines of reward-detail rendering outside this one formatting block are untouched).

## 21. Event-local display regression results

`app/test/eventShareAndRewardTimeDisplay.test.ts`: **6/6 pass**, including an explicit regression test confirming the primary `eventTimeModel` (the one powering Event Detail's hero/header display) still calls `formatEventTimeDisplay` unchanged.

---

## EVT-009 — Regression Coverage Only

## 22. Exact existing production behavior

Reconfirmed unchanged from the prior audit before touching anything: `assertOngoingEventScheduleUpdateAllowed` (`event.service.ts`) rejects any `updateEvent()` payload whose `scheduledAt` differs from the persisted value once an event is active (`persistedStartAt <= now < persistedEndAt`), while allowing the end time to move freely as long as it stays after "now." Frontend independently disables/grays the Start Date/Start Time controls for the same window (`isOngoingEdit` in `step-2.tsx`, unchanged, still intact — see §27 regression check).

## 23. Exact new venue/timezone test

`api/test/event-ticket-management.test.ts`, two new tests appended to the existing ongoing-event block:
1. **"a venue change that resolves to a DIFFERENT timezone is rejected"** — an active event with `timezone: "America/New_York"` and a persisted `scheduledAt` of `2026-07-20T19:00:00.000Z` (15:00 local) has its location changed to Los Angeles coordinates, with no `scheduledAt`/local-part fields sent. Asserts a 422 rejection and that the repository (`updateByIdForUser`) is never called.
2. **"a venue change that resolves to the SAME timezone succeeds normally"** — the same active event, moved to a different New-York-area venue (same resolved zone), asserts success and that the persisted start is unchanged in the response.

## 24. Whether production code changed for EVT-009

**No.** Per the task's explicit stop condition, this test was written and run *before* considering any production change. It passed on the first run against the existing, completely unmodified `assertOngoingEventScheduleUpdateAllowed`/`applyEventTimeZone` code. Production diff for EVT-009: **zero lines.**

## 25. Proof active Start remains immutable

The new "DIFFERENT timezone" test is the proof: even though `applyEventTimeZone` has no active-event special-casing and *does* recompute a new absolute instant when a venue moves to a genuinely different zone (by design — this is the approved wall-clock-preservation behavior for editing a not-yet-started event), that recomputed value becomes a defined `payload.scheduledAt` by the time `assertOngoingEventScheduleUpdateAllowed` runs, and its mismatch-against-persisted check (the same one already proven for a direct start-edit attempt) catches and rejects it. The historical start is never silently shifted.

## 26. Proof allowed End edit still succeeds

Covered both by the pre-existing, unmodified "ongoing event update allows unchanged persisted start with a future end" test (still green, §32) and by this batch's new `event-publish-schedule.test.ts` test exercising the same scenario through the `publish()` code path instead of `updateEvent()` (§14).

## 27. Result of active Event location/timezone change test

**Both new tests pass** against the unmodified production code — the different-zone case is correctly rejected, and the same-zone case correctly succeeds. This directly closes the one coverage gap the original EVT-009 audit identified, with no behavior change required.

---

## Regression

## 28. EVT-002 results

`app/test/eventWizardSteps.test.ts` (16) + `app/test/eventStepNavigatorWiring.test.ts` (32): **48/48 pass**, unchanged. Additionally, `eventStepTwoDateTimeLayout.test.ts` includes an explicit regression assertion that the navigator import/render line in `step-2.tsx` is still present and byte-identical after the layout reorder — confirmed passing.

## 29. EVT-004 results

Not directly touched this batch; the copy strings live in `index.tsx`, untouched. (Verified transitively — `app/test/eventBasicsCopyAndBannerRequired.test.ts` still 10/10 pass, part of the regression run in §32.)

## 30. EVT-005 results

`app/test/eventBanner.test.ts`: **11/11 pass**, unchanged — `eventBanner.ts`/`eventBannerValidation.ts` not touched this batch.

## 31. Ticket serializer results

`app/test/eventTicketPayload.test.ts` (6) + `app/test/eventTicketPayloadWiring.test.ts` (8): **14/14 pass**, unchanged — `eventTicketPayload.ts`/`eventDraftStore.ts`'s ticket-serialization code was not touched this batch. No new occurrence of `salesEnded`/`availableCount` in any write payload.

## 32. Relevant frontend test results

Combined run of `eventWizardSteps`, `eventStepNavigatorWiring`, `eventBanner`, `eventBasicsCopyAndBannerRequired`, `eventTicketPayload`, `eventTicketPayloadWiring`, `eventCreateTimezoneWiring`, `eventStepTwoOngoingEdit`, `eventStepThreeLocation`, `draftPreviewPrivacySelector`, `editFeatureWiring`, `eventWizardSessionMode`, plus this batch's `eventStepTwoDateTimeLayout` and `eventShareAndRewardTimeDisplay`: **182/182 pass.** Full frontend suite (`bun test`, 154 files): **1933 pass / 11 fail / 1 error** — pass count rose by exactly 14 (the 8 + 6 new tests) relative to the prior batch's 1919, and a name-by-name diff shows the exact same 11 pre-existing failing tests + 1 error as every previous batch (byte-identical apart from timing) — zero new frontend failures.

## 33. Relevant backend test results

`event-publish-schedule.test.ts` (new): **16/16 pass.** `event-ticket-management.test.ts` (with the 2 new EVT-009 tests): **26/26 pass.** `event-hashtags.test.ts` (with the one fixture-date fix): **20/20 pass.** `event-create-timezone.test.ts`, `event-draft-preview.test.ts`, `event-banner-required.test.ts`: **49/49 pass, unchanged.** Full backend suite (`bun test`, 121 files): **1192 pass / 278 fail / 8 errors** — pass count rose by exactly 18 (16 + 2 new tests) relative to the prior batch's 1174, and a name-by-name diff of every failing test shows the **exact same** failing-test set as before this batch (byte-identical). Zero occurrences of the new "cannot be in the past" error remain anywhere in the full-suite log outside the tests that intentionally trigger it.

## 34. TypeScript results

Backend: `tsc --noEmit` — **clean, zero errors.** Frontend: `tsc --noEmit -p tsconfig.json` — **5 pre-existing errors, identical in file/line to every previous batch** (`lib/momentPostMapper.ts` ×2, `test/smartFeedRankingLocation.test.ts` ×2, `test/mapPreviewSlideLayoutStability.test.ts` ×1) — **zero errors in any file this batch touched**, confirmed by grepping the output for every touched filename.

## 35. Lint result / environment blocker

**Frontend: ran successfully this time** (unlike the prior two batches, which were blocked by a Device Guard policy) — `npx eslint` against every touched frontend file (`step-2.tsx`, `event.tsx`, the three new test files, plus a broader pass including `eventTicketPayload.ts`/`eventDraftStore.ts` for good measure) found **one warning** (an unused variable in a draft version of `eventStepTwoDateTimeLayout.test.ts`), which was fixed; the final lint run is **clean, zero errors, zero warnings**. Backend: `npm run lint` **still cannot run** — same pre-existing cause as every previous batch, ESLint v9 requires `eslint.config.js`, which does not exist in `api/`. Not caused by this batch, not worked around.

## 36. Pre-existing failures

Unchanged from all previous batches. Backend: the same ~278 failures/8 errors across unrelated domains (missing local MongoDB/Redis, missing `ffmpeg`, the stale `event-taxonomy.test.ts` cross-project import, and assorted other pre-existing/environmental issues) — name-for-name identical to the pre-batch baseline. Frontend: the same 11 named failures + 1 error, all traced in prior reports to source belonging to other components (`RepostFeedCard`, attendee-list privacy, video-playback logic, map-marker-glow constants, a stale `getEventBadgeStatus` signature, a notification-settings test) — none reference Create Event, date/time, or the fixes in this batch.

## 37. Zero-new-regression confirmation

Confirmed by direct before/after diff on both suites (§32/§33) — the failing-test-name sets are identical, not merely similar in count, both before and after this batch's changes.

---

## Final

## 38. EVT-007 final status

**Complete.** Start Date + Start Time on one row, End Date + End Time on the next; no clipping risk (time text now shares the date text's flex/truncation guard); logical source order (Start Date → Start Time → End Date → End Time); zero change to any date/time value, handler, or validation logic.

## 39. EVT-008 final status

**Complete.** New events can no longer publish with a past start — enforced authoritatively in the backend, proven unbypassable via direct service/API calls, proven not to affect Save Draft or active-event edits. The Share sheet and reward-claim "Expires" line now display Event-local time, matching every other primary surface. Canonical UTC storage, Event timezone storage, DST gap/fold policy, and the venue-timezone-change wall-clock-preservation behavior are all confirmed unchanged (no file in the timezone-resolution core, `event-timezone.ts`, was touched).

## 40. EVT-009 final status

**Complete for this batch, as a test-only deliverable.** The missing venue/timezone-change regression coverage is now in place; both new tests pass against completely untouched production code, confirming the existing implementation was already correct. Production diff for EVT-009: zero.

## 41. Remaining known limitations

Carried over from the original audit, not addressed by this batch (out of scope): legacy (no-timezone) events' edit-picker can still drift based on the editing device's timezone (a pre-existing, bounded limitation of pre-Batch-3A data, not touched); EVT-010 (age restriction) display/enforcement gaps remain exactly as previously audited, entirely untouched by this batch.

## 42. Whether any P0 issue remains

**No.** The one confirmed P0 from the prior audit (new events publishing with a past start) is fixed and test-proven, including the direct-API-bypass scenario the audit specifically flagged as the exploit path. No new P0 was introduced or discovered during this implementation pass.
