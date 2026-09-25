# Audit — EVT-007 through EVT-010

Date/time layout, event time validation, active-event editing, age restriction consistency. Audit-only; no production code was modified. All findings are evidence-based, sourced from direct reading of the active codebase plus three parallel research passes over the backend timezone/service layer, active-event immutability path, and age-restriction full stack. Claims that could not be verified from source alone are marked explicitly.

---

## 1. Executive Summary

**EVT-007 (date/time layout) — C.** The four controls exist and work, but are grouped on the wrong axis: today's layout is *[Start Date, End Date]* on row 1 and *[Start Time, End Time]* on row 2 — dates together, times together — not the requested *[Start Date, Start Time]* / *[End Date, End Time]* pairing by event boundary. A secondary, real small-screen risk was found: the time selectors' `Text` lacks the `numberOfLines`/`flex` truncation guard the date selectors already have. Zero test coverage exists for this layout.

**EVT-008 (time validation) — D, despite genuinely strong underlying engineering.** Canonical UTC storage, end-before-start enforcement (frontend + backend, both layers), DST gap/fold handling, and the venue-timezone-change wall-clock-preservation logic are all well-designed, documented, and (mostly) test-covered. However, two findings meet the task's own explicit P0 triggers: (1) **no layer — frontend or backend — prevents a brand-new event from publishing with a past start**, other than a frontend-only gate on the Next/Publish button path that a direct API call bypasses entirely, and that doesn't even run on plain "Save Draft"; (2) **two display surfaces (the Share sheet and the reward-claim date line) format the event's raw UTC timestamp in the viewer's device-local timezone** instead of the Event-local helper every other surface uses, so the same event can show a materially different time on those two surfaces than on Feed/Detail/Map/Checkout.

**EVT-009 (active-event editing) — B.** This is the best-implemented of the four: the backend has a dedicated, well-tested guard (`assertOngoingEventScheduleUpdateAllowed`) that rejects any attempt to change an active event's `scheduledAt` while allowing the end time to be freely extended/shortened as long as it stays in the future — exactly the requirement, and exactly the "edit only End time on an already-started event" scenario succeeds today, proven by a real runtime test. The frontend independently disables/grays the start controls and never resends a mutated start. The one gap is a coverage gap, not a behavior gap: the interaction between an active event's immutable start and a venue/timezone change is untested (analysis suggests it's incidentally blocked by the same guard, but this specific combination has no test).

**EVT-010 (age restriction) — C.** The three-value enum is clean and consistent end-to-end for creation, persistence, and backend validation. But the display requirement is not met as written: Feed and Search don't show age restriction at all (2 of the 4 named surfaces), Event Detail uses different wording (`"18+ only"`/`"All ages"`) than every other surface (`"18+"`/`"All Ages"`), and — most importantly — age restriction is **purely a label today**: nothing in checkout or the join/RSVP flow reads it, and the user model has no verified date-of-birth field to enforce against even if someone wired it up (only a self-reported, unverified `age: number`). This is a genuine feature gap, not a security regression — the app doesn't claim to enforce what it doesn't — but it is a clear miss against the stated acceptance criterion.

---

## 2. Final Classification Table

| Requirement | Classification | One-line reason |
|---|---|---|
| EVT-007 — Date/time layout | **C** | Controls are grouped by field-type (dates row, times row), not by event boundary (start row, end row) as required; a secondary small-screen truncation risk exists; zero test coverage |
| EVT-008 — Time validation | **D** | Excellent DST/timezone/round-trip engineering, but a new event can publish with a past start (no backend check, bypassable frontend-only gate), and two surfaces (share sheet, reward claim) show device-local instead of Event-local time |
| EVT-009 — Active event editing | **B** | Backend and frontend both correctly enforce start immutability while allowing safe end edits, exactly per spec, with real test coverage; only gap is an untested active-event + timezone-change interaction |
| EVT-010 — Age restriction | **C** | Clean 3-value enum and correct persistence, but 2 of 4 required display surfaces show nothing, Event Detail's wording diverges from the rest of the app, and there is no ticket/join enforcement (nor any verified age data to enforce against) |

---

## 3. Date/Time Architecture Map

1. **Create Event screen for date/time**: `app/app/create-event/step-2.tsx` ("Details" step).
2. **Create Event screen for age restriction**: same file, `step-2.tsx` (age chips render just above categories).
3. **Local state fields** (step-2.tsx): `selectedAge`, `startDate`/`endDate`/`startTime`/`endTime` (all `Date | null`), plus `startScheduleTouchedRef`/`endScheduleTouchedRef` (booleans tracking whether the user actually touched a picker this session).
4. **Store fields** (`app/stores/eventDraftStore.ts`): `ageRestriction`, `scheduledAt`/`endAt` (ISO strings, "legacy/compat absolute values"), `scheduledLocalDate`/`scheduledLocalTime`/`endLocalDate`/`endLocalTime` (transport-only wall-clock), `timezone` (server-resolved IANA string, edit-hydration only), `scheduleWallClockDirty` (gates whether local parts are resent on an existing event).
5. **Frontend validation schema**: `createEventStepTwoSchema` (step-2.tsx, Zod) for shape/presence; `getEventStepTwoScheduleErrors` (`app/lib/eventStepTwoValidation.ts`) for past-date/range/ongoing-edit semantics.
6. **Request payload fields**: `EventPayload`/`SaveEventDraftDto` (`app/lib/events.ts`, `api/src/modules/events/event.interface.ts`) — `scheduledAt`, `endAt`, `scheduledLocalDate`, `scheduledLocalTime`, `endLocalDate`, `endLocalTime`, `timezone` (controlled fallback only), `ageRestriction`.
7. **Local wall-clock transport fields**: `scheduledLocalDate`/`scheduledLocalTime`/`endLocalDate`/`endLocalTime` — transport-only, stripped before persistence (`api/src/modules/events/event.service.ts:2940-2944`, and again defensively in `normalizePublishPayload`, `event.service.ts:3127-3130`).
8. **Canonical UTC fields**: `scheduledAt`/`endAt` — `Date` type in Mongoose (`api/src/modules/events/event.model.ts:481-490`), always absolute UTC instants regardless of timezone (explicit comment, `event.interface.ts:443`).
9. **Event timezone field**: `timezone: { type: String, default: null }` (`event.model.ts:494-497`) — advisory IANA string, never used to reinterpret `scheduledAt`/`endAt` at read time.
10. **Backend Zod validation**: `api/src/modules/events/event.validation.ts` — `dateTime`/`optionalDateTime` (parsing), `validateEventDateRange` (end > start), `eventAgeRestrictions` enum reuse for `ageRestriction`.
11. **Service normalization/conversion**: `EventService.applyEventTimeZone` (`event.service.ts:2927-3026`) — the 5-tier timezone-resolution cascade; `EventService.assertOngoingEventScheduleUpdateAllowed` (`event.service.ts:3558-3597`) — active-event start-immutability/end-future guard.
12. **Event model fields**: covered in #8/#9; `ageRestriction: { type: String, enum: eventAgeRestrictions, default: null }` (`event.model.ts:453-457`).
13. **Edit Event hydration**: `eventDraftStore.ts loadFromEvent()` — derives wall-clock parts via `deriveEventWallClockParts`, seeds `scheduledLocalDate`/etc. and `ageRestriction`.
14. **Display helpers**: `app/lib/eventTimeDisplay.ts formatEventTimeDisplay` (primary Event-local formatter, used by Feed/Search/Map/Detail); `app/components/home/MapContainer.tsx formatAgeLimit`; `app/components/eventTabs/AboutTab.tsx formatAgeLabel`.
15. **Checkout time rendering**: `app/app/event-screen/checkout.tsx` — renders a pre-formatted string passed in via route params (built upstream from `event.tsx`'s `eventTimeModel`, itself from `formatEventTimeDisplay`) — inherits Event-local formatting, does not reformat.
16. **Search/Map/Feed/Event Detail rendering**: all route through `formatEventTimeDisplay` (see Display Matrix, §27).
17. **Email/calendar serialization**: **not found** — no ICS/VCALENDAR generation anywhere in the repo; no event date/time content in any email template (see §29/§30).

---

## 4. Age Restriction Architecture Map

| Layer | Value/location |
|---|---|
| UI labels | `AGE_OPTIONS = ['All Ages', '18+', '21+']` — `app/app/create-event/step-2.tsx:39` |
| Internal mapping | `toAgeRestriction`/`fromAgeRestriction` — `app/stores/eventDraftStore.ts:182-204` |
| Backend enum | `eventAgeRestrictions = ["all_ages", "18_plus", "21_plus"] as const` — `api/src/modules/events/event.interface.ts:11-12` |
| Model field | `ageRestriction: { type: String, enum: eventAgeRestrictions, default: null }` — `event.model.ts:453-457` |
| Duplicate mapping | `FilterModal.tsx:65,68-77` — independently hardcodes the same 3 labels/values rather than importing the store's mapping functions (structural drift risk, currently in sync) |

---

## EVT-007 — Date/Time Layout

## 5. Classification: **C**

## 6. Current Layout

`app/app/create-event/step-2.tsx:563-640`. Parent: `<View style={styles.dateTimeGroup}>` (`marginBottom: 24`, no other layout constraint). Inside it, two `<View style={[styles.row, styles.dateRow]}>` / `<View style={styles.row}>` rows, each `flexDirection: 'row', alignItems: 'center'`. Row 1 contains Start Date (`marginRight: 8`) and End Date (`marginLeft: 8`), each wrapped in `dateTimeColumn: { flex: 1 }`. Row 2 contains Start Time and End Time, same column styling. Each control is a `TouchableOpacity` (`styles.selector`: `flexDirection: row, alignItems: center, justifyContent: space-between, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12`) containing an `Ionicons` icon (`calendar-outline`/`time-outline`, 18px, `marginRight: 8`) and a `Text` showing the formatted value or a placeholder.

## 7. Start/End Row Grouping

**Not compliant with the requirement.** Rows are grouped by **field type** (all dates in row 1, all times in row 2), not by **event boundary** (start fields together, end fields together) as EVT-007 explicitly asks for. Classified as **vertically separated** per the audit's own taxonomy: the visual relationship between "this is the START" and "this is the END" is not obvious from row grouping — a user scanning top-to-bottom sees "two dates, then two times," not "start info, then end info."

## 8. Small-Screen Clipping Risk

Source-level only (no real-device QA performed, per instructions). Two distinct risk profiles:
- **Date selectors**: `compactSelectorText` style has `flex: 1, fontSize: 13`, and the JSX explicitly sets `numberOfLines={1}` (`step-2.tsx:578, 595`) — text truncates safely rather than overflowing or wrapping.
- **Time selectors**: `selectorText` style has only `fontSize: 15` (no `flex`), and the JSX does **not** set `numberOfLines` on either time `Text` (`step-2.tsx:616-618, 633-635`). Since each column is already halved by `dateTimeColumn: { flex: 1 }` and further constrained by the icon (18px) + `paddingHorizontal: 16` on each side, a longer localized time string (larger accessibility font size, or a locale whose AM/PM rendering is wider) has no explicit single-line truncation guard — RN's default behavior for an unconstrained `Text` in a `flexDirection: row` sibling-of-fixed-icon layout is to wrap to a second line rather than clip, which would silently break the two time columns' equal-height alignment on narrow screens. This is asymmetric with the date selectors' explicit guard and is the one concrete, source-provable small-screen risk found.
- No hardcoded pixel widths were found on any of these containers (all use `flex: 1`), so pure horizontal overflow (content pushing the layout past screen edge) is unlikely; the risk is wrapping/height-mismatch, not clipping-off-screen.

## 9. Tab/Focus Order

All four controls are `TouchableOpacity` (Pressables), not `TextInput`s, so there is no OS-level tab order to audit — interaction order is purely a function of visual/DOM order. Current JSX order is Start Date → End Date → Start Time → End Time (row-major, matching the current row grouping), which does **not** match the sequential Start-Date→Start-Time→End-Date→End-Time order the requirement implies as "logical." No `accessibilityRole`/`accessible` ordering hints beyond default View/TouchableOpacity behavior were found on these four controls specifically.

## 10. Tests

**None.** Grepped `app/test/` for `dateTimeColumn`/`dateRow`/`START DATE`/`START TIME`/`step-2.tsx` — four files reference `step-2.tsx` for unrelated reasons (navigator wiring, timezone wiring, session-mode, ongoing-edit validation), and zero reference the layout style names (`dateTimeColumn`, `dateRow`) at all. No runtime or source-text test exists for the row-grouping, small-screen safety, or focus order of this layout.

## 11. Exact Gaps

1. **Row grouping is on the wrong axis.** File: `app/app/create-event/step-2.tsx:564-640`. Change scope: re-order the four controls into two rows (Start Date + Start Time / End Date + End Time) — a JSX reorder plus corresponding label/width tweaks, no state or validation logic needs to change (see §Cross-Requirement AK).
2. **Time-value text lacks the same truncation guard as date-value text.** File: `step-2.tsx:616-618, 633-635`, style `selectorText` (`step-2.tsx:~861`). Add `numberOfLines={1}` (and ideally `flex: 1` on the style) matching the date selector's existing pattern.
3. **No test coverage** for the layout at all — not a functional bug, but means a regression here would go undetected.

---

## EVT-008 — Event Time Validation

## 12. Classification: **D**

## 13. Canonical UTC Storage

Confirmed exactly as expected. `scheduledAt`/`endAt` are `Date` fields in Mongoose (`api/src/modules/events/event.model.ts:481-490`, both indexed), typed `Date | null` in `IEvent` (`event.interface.ts:437-445`), with an explicit comment that they "remain absolute UTC instants regardless" of timezone handling (`event.interface.ts:443`).

## 14. Timezone Storage

`timezone: { type: String, default: null }` (`event.model.ts:494-497`) — a separate advisory IANA string, added in "Batch 3A," used only for wall-clock reconstruction on edit/display, never to reinterpret the stored instants at read time.

## 15. Local Wall-Clock Transport

`scheduledLocalDate`/`scheduledLocalTime`/`endLocalDate`/`endLocalTime` on `SaveEventDraftDto` (`event.interface.ts:485-493`, documented "Never persisted"). Confirmed stripped: `delete normalized.scheduledLocalDate; ...` inside `applyEventTimeZone` (`event.service.ts:2940-2944`), with a second defensive strip in `normalizePublishPayload` (`event.service.ts:3127-3130`). These fields never reach the repository/schema.

## 16. End-Before-Start Validation

`validateEventDateRange` (`event.validation.ts:480-488`) uses `endAt <= scheduledAt` → rejects both `end < start` and `end == start`; only `end > start` passes. Wired into `draftBody`, `draftPatchBody`, and `publishBody` (i.e., every write path: save draft, update draft, update published event, publish/publish-draft — `event.validation.ts:530-546`, confirmed against `eventValidation`'s route wiring at `:664-681`). A second, independent backend-layer guard, `assertConvertedScheduleOrdering` (`event.service.ts:3028-3042`), re-checks the same `<=` condition *after* timezone conversion, inside the two timezone-resolution tiers that recompute instants — so a schedule that passed Zod pre-conversion but became invalid post-conversion (a theoretical edge case) is still caught. **Backend is authoritative on both counts** (pre- and post-timezone-conversion).

## 17. New-Event Past-Start Validation

**Gap confirmed.** No layer — Zod schema or service method — rejects a past `scheduledAt` for a brand-new draft save or a brand-new publish. `event.validation.ts` has no `now`-comparison refinement anywhere for `scheduledAt`/`endAt` (only `validateTicketSalesEndDates` checks a *ticket's* `salesEndAt` against "now," unrelated to the event's own start). `EventService.saveDraft()` and the new-event branch of `publish()` call no past-date assertion.

Frontend: `getEventStepTwoScheduleErrors` **does** reject a past start (`scheduledAt < now` → `"Start date and time cannot be in the past."`, `eventStepTwoValidation.ts:82-85`), but this function is only invoked by `validateStepTwo()`, which is only called from `handleNext` (advancing toward Location/Tickets/Privacy) and `handleSaveAndExit` (only reachable while editing an already-published event). **`handleSaveDraft` — the plain "Save Draft" button for a brand-new event — calls `persistStepTwo()` directly without ever calling `validateStepTwo()`**, so a brand-new draft can be saved with a past start with zero validation anywhere. And since the backend also never checks this, even the "Publish" path's frontend-only gate is the *sole* line of defense — bypassable by any direct API call, and not present at all for Save Draft.

**Net rule as implemented**: Save Draft — unrestricted (can be past; arguably correct, since a draft is legitimately allowed to be incomplete/placeholder). Publish — frontend-gated only, no backend enforcement. This is the exact "new Event publishes with invalid past start" P0 trigger the task named, confirmed reachable via a direct API call to `POST /events/publish`.

## 18. Timezone-Resolution Precedence

`applyEventTimeZone` (`event.service.ts:2927-3026`), 5 tiers, in order:
1. Resolved coordinates + explicit local wall-clock parts entered this session → authoritative conversion, sets `normalized.timezone` (`:2960-2977`).
2. Venue changed to a different *known* zone, no explicit schedule edit this session → `reinterpretInstantInZone` preserves the wall-clock, recomputes the instant (`:2981-3004`).
3. Same resolved zone as before → no-op, `normalized.timezone = existingZone` (`:3007-3010`).
4. No resolvable zone from coordinates, but client sent a validated `payload.timezone` → controlled fallback (`:3013-3017`).
5. Nothing resolvable → preserve `existingZone` if any, else leave `timezone` unset — explicit "never invent or shift" comment (`:3019-3025`).

`scheduleTouched` (gating tier 2 vs 1) is `startParts !== null || endParts !== null || payload.scheduledAt !== undefined || payload.endAt !== undefined` (`:2953-2957`). This precedence was **not changed** by this audit and should not be — it is well-designed.

## 19. DST Gap Behavior

**Normalized forward to the first valid instant**, not rejected, not ambiguous. `eventLocalPartsToInstant` (`api/src/modules/events/event-timezone.ts:222-252`) probes candidate offsets; if zero candidates render the requested wall-clock (a gap, e.g. 2:30 AM during a 1:59→3:00 spring-forward), it falls to `findTransitionInstantMs` (`:198-213`), a binary search for "the first millisecond that carries the post-transition offset." The module's own doc comment states the policy explicitly: "spring-forward GAP: the first valid local instant after the gap (the transition boundary itself)" (`event-timezone.ts:17-19`).

## 20. DST Fold Behavior

**Earlier occurrence chosen, deterministically.** Same function's "≥1 match" branch sorts `validInstants` ascending and returns index `[0]` (`event-timezone.ts:240-246`). Doc comment: "fall-back FOLD: the EARLIER occurrence" (`:20`). Consistent by construction across create/edit/preview since they all funnel through this single pure function — no separate DST logic exists elsewhere to diverge from it.

## 21. Timezone-Change Behavior

**Wall-clock is preserved at the new venue; the absolute UTC instant shifts.** This is tier 2 above (§18): a user who entered 7:00 PM, then changes the event's venue to a different timezone (with no explicit date/time re-edit), keeps "7:00 PM" as the displayed local time at the new venue — `reinterpretInstantInZone` (`event-timezone.ts:277-286`) reads the old zone's wall-clock parts off the existing instant and reconverts those same numeric parts through the new zone, so the persisted `scheduledAt` UTC value changes to match. This matches the frontend's own intent (`step-2.tsx` comment: "a venue-only edit leaves these false so the schedule is NOT re-sent as an explicit edit"). This is a confirmed, deliberate, already-implemented product decision — not something this audit is recommending or judging.

## 22. Create→Persist→Edit Round Trip

**No drift for timezone-known events.** `resolveInitialPickerDate` (`app/lib/eventLocalTime.ts:142-164`) has a 3-tier priority: (1) explicit stored wall-clock parts, (2) `instantToWallClockPartsForEvent` reinterpreting the instant in the Event's known IANA zone, (3) legacy fallback — raw `new Date(scheduledAt)` interpreted by the *device's own* clock zone. `deriveEventWallClockParts` (`eventDraftStore.ts:243-271`) returns `null` when `event.timezone` is unset, which is the only way tier 3 is reached. **For a timezone-known event, the edit picker shows exactly the venue-local time the host intended, regardless of the editing device's own timezone** — confirmed no drift. **For a legacy/no-timezone event**, the picker falls back to interpreting the raw UTC instant through the *device's* local clock — if the editing device is in a different zone than whatever produced the original `scheduledAt`, the picker could show a different wall-clock than what was originally intended. This is a known, bounded limitation of pre-timezone-architecture legacy data, not a new bug; whether any given legacy event is actually affected cannot be proven from source alone.

## 23. Preview Consistency

Confirmed via `app/app/event-screen/event.tsx`'s `eventTimeModel` (lines ~1042-1059), built from `formatEventTimeDisplay` using `scheduledAt`/`endAt`/`timezone` — the same helper used by every primary display surface (see matrix below). Preview is the Event Detail screen itself (per the previous EVT-001 audit's finding that "Preview" navigates to Event Detail), so it inherits Event Detail's consistency directly, not a separate formatting path.

## 24-27. Feed / Search / Map / Event Detail Consistency

All four route through the same `formatEventTimeDisplay` helper (`app/lib/eventTimeDisplay.ts`) with the same three inputs (`scheduledAt`, `endAt`, `timezone`) — confirmed **consistent** across these four primary surfaces. See the matrix in §Display Matrix for exact citations. Event Detail additionally shows a secondary "your time" line only when the viewer's device clock differs from the Event-local time (`event.tsx:2085-2090`), which is an intentional additive clarification, not an inconsistency.

## 28. Checkout Consistency

`app/app/event-screen/checkout.tsx` does **not** independently format the event's raw UTC timestamp — it receives an already-formatted string via route params (built upstream in `event.tsx` from the same `eventTimeModel`/`formatEventTimeDisplay` output), so it inherits Event-local correctness rather than risking a second, divergent formatting path. **Confirmed safe** — Checkout does not format UTC in device-local time.

## 29. Email Consistency

**NOT FOUND.** Grepped `api/src/core/email/email.service.ts` and the broader email-related code for `scheduledAt` or date-formatting keywords — no Event-related email template contains event date/time content. Stated per instructions: not applicable, not invented.

## 30. Calendar Consistency

**NOT IMPLEMENTED / NOT FOUND** as a true calendar export. No `.ics`/`VCALENDAR` generation exists anywhere in `app/` or `api/src/`. The only "Add to Calendar"-labeled UI (`app/components/ui/MapScreen.tsx:1260-1278`, `app/components/ui/EventPreviewModal.tsx:79,118,360`) navigates to the app's own internal "Plan" feature (`/plan-screen/create-plan`), passing the raw `scheduledAt` as a route param — not an ICS/native-calendar export. What `create-plan.tsx` does with that value was out of the audited scope and was not traced further.

## 31. Tests

Not independently inventoried in exhaustive detail by this pass beyond what the EVT-009 agent found adjacent to it (`event-create-timezone.test.ts`, referenced in a prior EVT-004/005 audit as covering the DST/timezone-resolution cascade with real runtime tests against a mocked-repository `EventService` — see the previous full audit report for that file's specific test names). No test was found covering: the new-event past-start gap (§17), or the device-local display bugs (§Display Matrix additional finding) — both are unverified-by-test as well as unfixed.

## 32. Exact Gaps

1. **New event can publish with a past start — no backend enforcement, and the frontend gate doesn't even cover Save Draft.** Files: `api/src/modules/events/event.validation.ts` (no past-date refine on `publishBody`'s `scheduledAt`), `api/src/modules/events/event.service.ts` (`publish()`'s new-event branch, `:461-482`, no assertion), `app/app/create-event/step-2.tsx` (`handleSaveDraft`, `:362-380`, skips `validateStepTwo()`). Impact: a published event can start in the past, confusing hosts/attendees and breaking any "upcoming events" assumption downstream. Smallest likely fix: add a `scheduledAt >= now`-style refine to `publishBody` (backend, authoritative) — the frontend gate already exists for the happy path and doesn't need to change.
2. **Two display surfaces use device-local formatting instead of Event-local.** Files: `app/app/event-screen/event.tsx:2845` (Share sheet `dateTimeLabel`, raw `new Date(event.scheduledAt).toLocaleString(...)`), `event.tsx:2578-2580` (reward-claim expiry, raw `toLocaleDateString`/`toLocaleTimeString`). Impact: a viewer in a different timezone than the event's venue sees a different time on these two surfaces than on Feed/Detail/Map/Checkout for the same event — exactly the task's named P0 pattern, though narrowly scoped to these two secondary surfaces rather than the primary display surfaces. Smallest likely fix: route both through `formatEventTimeDisplay` like every other surface.
3. **Legacy (no-timezone) events' edit picker can drift** based on the editing device's timezone (§22) — a known, bounded limitation of pre-Batch-3A data, not a new/introduced bug, and not independently fixable without a backfill (which is explicitly out of scope).

---

## EVT-009 — Active Event Editing

## 33. Classification: **B**

## 34. Active Event Definition

No single shared "active" status function exists for edit-permission purposes (the `event-temporal-status.ts getNowStatus`/`isActiveSmartFeedEvent` functions exist but serve Smart Feed ranking, not edit permissions). The edit-time active check is inlined identically in two places using the same window: **frontend** `isOngoingPublishedEventEdit` (`app/lib/eventStepTwoValidation.ts:42-62`, `originalScheduledAt <= now < persistedEndAt`) and **backend** `assertOngoingEventScheduleUpdateAllowed`'s early-return guard (`api/src/modules/events/event.service.ts:3558-3597`, same `persistedStartAt <= now < persistedEndAt` window, confirmed by direct quote: `if (persistedStartAt.getTime() > now.getTime() || now.getTime() >= persistedEndAt.getTime()) return;`). The two independently-written definitions are identical — no drift found.

## 35-36. Current Edit UI Behavior / Start Control Result

Confirmed (both by direct reading and the backend audit): in `step-2.tsx`, when `isOngoingEdit` is true, the Start Date and Start Time `TouchableOpacity` controls get `disabled={isOngoingEdit}` and `styles.disabledControl` (`opacity: 0.55`) applied (`step-2.tsx:572-575, 610-613`), and their native date/time pickers are never rendered (`showStartDatePicker && !isOngoingEdit`, `showStartTimePicker && !isOngoingEdit`). **Exactly matches the requirement: disabled and visually grayed.**

## 37. Frontend Start Immutability

`persistStepTwo()` explicitly uses the historical, unrecomputed value when ongoing-editing: `if (isOngoingEdit && originalScheduledAt) { scheduledAt = originalScheduledAt; }` (`step-2.tsx`, confirmed in prior read) — it does not derive `scheduledAt` from the (disabled, unusable) `startDate`/`startTime` local state at all. It also explicitly withholds start wall-clock transport fields (`scheduledLocalDate: null, scheduledLocalTime: null`) for an ongoing edit, while still allowing end wall-clock fields through if the end was touched.

## 38. Backend Start Immutability

**Server-enforced, not merely frontend-trusted.** `assertOngoingEventScheduleUpdateAllowed` explicitly compares any incoming `scheduledAt` against the persisted value when the event is active:
```ts
if (payload.scheduledAt !== undefined) {
  const submittedStartAt = this.getValidDateOrNull(payload.scheduledAt);
  if (!submittedStartAt || submittedStartAt.getTime() !== persistedStartAt.getTime()) {
    throw new AppError("Event start date and time cannot be changed after the event has started.", httpStatus.UNPROCESSABLE_ENTITY);
  }
}
```
(`event.service.ts:3576-3585`). A mismatched `scheduledAt` is rejected with 422 **before** `eventRepository.updateByIdForUser` is ever called — a crafted/malicious client payload attempting to move an active event's start cannot succeed. Test-confirmed: `"ongoing event update rejects changing persisted start time"` (`api/test/event-ticket-management.test.ts:417-436`).

## 39. End-Time Edit Behavior

Only rule: submitted `endAt` must be strictly greater than "now" (`event.service.ts:3587-3596`, 422 `"Event end date and time must remain in the future for an ongoing event."` if not). No rule blocks shortening the end time (as long as it stays `> now` and `> scheduledAt`, per the always-applicable `assertConvertedScheduleOrdering`/`validateEventDateRange`). **"Safely edited" in current code means: any end value that is both after the immutable start and still in the future is accepted — extend or shorten, both allowed.**

## 40. Extend-End Test

`"ongoing event update allows unchanged persisted start with a future end"` (`event-ticket-management.test.ts:394-415`) — live event started 19:00, "now" is 20:00, ends 22:00; payload keeps `scheduledAt` unchanged and moves `endAt` to 23:00 (a 1-hour extension) → asserts success, and that the exact payload reaches `updateByIdForUser`. **This is precisely the task's named "Event started 30 minutes ago, edit End time +1 hour, expect success" scenario** — confirmed by direct trace to succeed, and independently test-verified.

## 41. Shorten-End Behavior

Not separately named in a dedicated test, but the same validation path (`assertConvertedScheduleOrdering` + the future-only end check, §39) applies identically regardless of extend-vs-shorten direction — a shortened end time is accepted as long as it remains after both the immutable start and "now." No asymmetric handling was found.

## 42. Unchanged-Past-Start Save Behavior

**Succeeds — this is the core of the fix requested by the task's hypothetical bug, already working correctly today.** Full trace: `getModifiableEventForOwner` passes (event hasn't ended); `assertOngoingEventScheduleUpdateAllowed` enters the ongoing branch (`persistedStartAt <= now < persistedEndAt`); since the frontend sends `scheduledAt: originalScheduledAt` (not omitted, but equal to the persisted value), the mismatch check (`!==`) does not trigger; the new `endAt` passes the future-only check; save succeeds.

## 43. Exact Rejection Source If Broken

**Not broken** — no rejection occurs in this scenario. (Documented here per the report template; the "if so" branch does not apply.)

## 44. Timezone/Location Interaction

`applyEventTimeZone` has **no branch conditioned on event status** — it runs identically for draft, published, and live events. If a host changes an active event's venue to a different *known* timezone with no explicit schedule edit, tier 2 (§18/§21) reinterprets the wall-clock and recomputes `scheduledAt` to a **different absolute instant** than the persisted one. Since `normalizeDraftPayload`/`applyEventTimeZone` runs *before* `assertOngoingEventScheduleUpdateAllowed` in `updateEvent`'s call order, this recomputed `scheduledAt` becomes a defined (non-`undefined`) value in the payload, which the immutability guard then compares against the persisted start — and since the recomputed instant differs, it will almost certainly be rejected with the same 422 "cannot be changed after the event has started" error. **This means the risk is likely already incidentally blocked**, but only as a side effect of the immutability guard, not because `applyEventTimeZone` itself is aware of active-event semantics — and this specific interaction (live event + venue/timezone change) has **no test** exercising it, so its correctness is inferred from code reading, not proven.

## 45. Tests

`api/test/event-ticket-management.test.ts` — confirmed **runtime tests** against the real `EventService`, constructed with a mocked repository (`findByIdForUser`/`updateByIdForUser` stubs) and an injectable `now` via the service's `getServerNow` constructor parameter (not a source-text/regex test). Four directly relevant tests: extend-end-succeeds (`:394`), reject-start-change (`:417`), reject-end-in-past (`:438`), and a parameterized already-ended-event rejection test (`:459`, covers both `"published"` and `"live"` status). No test exists for the timezone-change-on-active-event interaction (§44).

## 46. Exact Gaps

1. **Untested interaction**: an active event's location/timezone change, combined with the start-immutability guard. Files: `api/src/modules/events/event.service.ts` (`applyEventTimeZone`, `assertOngoingEventScheduleUpdateAllowed`), test file `api/test/event-ticket-management.test.ts` (where such a test would belong). Impact: low — analysis suggests the existing guard already blocks the risky case, but this is unverified, so a future refactor of either function could silently reintroduce a start-mutation path without any test catching it. Smallest likely fix: add one test combining a live event, a venue change to a different resolvable timezone, and no explicit schedule touch — assert the resulting 422.

---

## EVT-010 — Age Restriction Consistency

## 47. Classification: **C**

## 48. Exact Enum/Value Mapping

| UI label | Internal value | Backend enum |
|---|---|---|
| `'All Ages'` | `'all_ages'` | `'all_ages'` (default) |
| `'18+'` | `'18_plus'` | `'18_plus'` |
| `'21+'` | `'21_plus'` | `'21_plus'` |

Sources: `AGE_OPTIONS` (`step-2.tsx:39`), `toAgeRestriction`/`fromAgeRestriction` (`eventDraftStore.ts:182-204`), `eventAgeRestrictions` (`event.interface.ts:11-12`), model field (`event.model.ts:453-457`, schema also allows `null` = unset, no 4th value). A **duplicate, independently hardcoded copy** of this exact mapping exists in `app/components/home/FilterModal.tsx:65,68-77` (`AGE_OPTIONS`/`AGE_OPTION_TO_VALUE`/`AGE_VALUE_TO_OPTION`) rather than importing the canonical mapping functions — currently in sync, but a structural drift risk (a future value/label change would need to be made in two places).

## 49. Create Event Selection

All three chips render from `AGE_OPTIONS.map(...)` (`step-2.tsx:518-537`); `handleAgeSelect` sets `selectedAge` (`:225-228`); Zod requires a selection (`z.enum(AGE_OPTIONS, {...})`, `:61-64`). Default on a fresh session: `"all_ages"` (`eventDraftStore.ts createInitialState:142`).

## 50-51. Save Draft / Publish Persistence

Confirmed correct round-trip: `persistStepTwo` → `setStepTwo` → store's `ageRestriction`; `saveDraft()`/`publish()` both send `state.ageRestriction` verbatim (`eventDraftStore.ts:810, 657`). No dropping or transformation found.

## 52. Edit Event Behavior

`loadFromEvent` restores `event.ageRestriction ?? "all_ages"` (`eventDraftStore.ts:726`); step-2's local `selectedAge` re-derives via `fromAgeRestriction(draftAgeRestriction)` with an `isAgeOption` guard falling back to `'All Ages'` for any unrecognized string (defensive against corrupted/legacy data). **No option is UI-only** — all three fully round-trip through create, draft-reopen, and published-event edit.

Backend validation (Part AD): `draftBodyBase`'s `ageRestriction: z.enum(eventAgeRestrictions).optional().nullable()` (`event.validation.ts:463`, optional for drafts — same pattern as other draft fields), tightened to **required** on `publishBody` (`:536`, no `.optional()`) — mirrors how `name`/`categories`/`scheduledAt`/`location` are also required-on-publish-only. Any value outside the 3-item enum is rejected by Zod at the schema layer, on every write path (draft save, update, publish). Query-side filters (`mapQuery`, `feedQuery`) independently validate the same enum (`:560, 600`).

## 53-56. Display Matrix

| Surface | File:line | Output | Matches canonical? |
|---|---|---|---|
| Feed card | `app/components/home/EventFeedCard.tsx` | **not rendered at all** (grepped whole file, no age references) | N/A — not displayed |
| Search | `app/app/discover-screen/search.tsx` | **not rendered at all** (grepped, no matches) | N/A — not displayed |
| Map card/marker | `MapContainer.tsx:107-117` `formatAgeLimit()` → `MapScreen.tsx:163,1230,1592` passthrough | `"All Ages"` / `"18+"` / `"21+"` | Yes, exact canonical match |
| Event Detail (About tab) | `app/components/eventTabs/AboutTab.tsx:95-105` `formatAgeLabel()` | `"All ages"` / `"18+ only"` / `"21+ only"` | **No — diverges**: lowercase "ages," and an added " only" suffix not used anywhere else |
| Profile Events | `app/components/profile/ProfileEvents.tsx` | not shown | N/A |
| Checkout | `app/components/event/checkout/*` | not shown/referenced | N/A |
| Filter chip (input) | `FilterModal.tsx:65,73-77` | `"All Ages"` / `"18+"` / `"21+"` | Yes, but via a duplicated/independent mapping (§48) |
| Filter summary text | `app/lib/eventFilters.ts:398-399` `AGE_SUMMARY_LABEL` | `"21+"` (confirmed via `app/test/filtersLocationBatch2a.test.ts:81`) | Yes |

**Requirement as written asks for consistency across Feed/Search/Map/Event Detail specifically — of those four, two (Feed, Search) show nothing at all, and one (Event Detail) uses different wording than Map.** Only Map matches the canonical label exactly among the four named surfaces.

## 57. Checkout Label

Not shown — age restriction is not referenced anywhere in the checkout UI (grepped `app/components/event/checkout/*`, zero matches).

## 58. Ticket-Flow Enforcement

**Not enforced — presentation-only, and technically unenforceable today.** Grepped the entire `api/src/modules/payments` directory (`checkout-payment.service.ts`, `.repository.ts`, `.controller.ts`, `.validation.ts`, `.model.ts`, `.interface.ts`) for `ageRestriction` — zero matches. `event.service.ts`'s only 3 `ageRestriction` references (`:1196, 3117, 4667`) are query-filter pass-through and response serialization, not an eligibility check. The user model has an `age` field (`api/src/modules/user/user.model.ts:87-92`, `Number, min 0, max 130, default null`), but it is a **plain self-reported/admin-editable number, not a verified date of birth** — there is no DOB field anywhere in the user module. Even if someone wired a comparison up, there is no verified identity data to enforce against, only an honor-system number. **Conclusion: enforcement cannot be proven and should be classified as presentation-only.**

## 59. Join-Flow Enforcement

Same conclusion. `EventService.submitJoinRequest` (the locked-event join flow, `event.service.ts:2553-2593`) checks only: event exists and is published/live, `privacy === "locked"`, requester isn't the host, and duplicate-request short-circuit. No reference to `ageRestriction` or user `age` anywhere in this method or its neighbors (`listJoinRequests`, `joinRequestAction`).

## 60. User-Age Trust/Data Availability

As stated in §58: the only age-adjacent field on the user model is a bare, unverified, self-reported `age: number`. There is no trust boundary to report for an *enforcement* mechanism because no enforcement mechanism exists to audit — this is the honest, non-speculative conclusion, not an invented finding.

## 61. Tests

**Age-restriction plumbing (filters) is well-covered by real runtime tests**: `app/test/eventFilters.test.ts`, `filtersLocationBatch1.test.ts`, `filtersLocationBatch1_1.test.ts` all import real functions from `app/lib/eventFilters.ts`/`mapEventRequests.ts` and assert real behavior (e.g. `assert.equal(params.ageRestriction, "18_plus")`) — genuine runtime/unit coverage of the filter-application/request-building logic. `filtersLocationBatch2a.test.ts:81` calls a real summary-string-building function with `ageRestriction: "21_plus"` and checks the composed output — also runtime, not source-regex.

**Everywhere else, `ageRestriction: "all_ages"` appears only as required fixture boilerplate** on event-document test fixtures across ~15 backend test files (`event-card-consistency.test.ts`, `event-taxonomy.test.ts`, `event-draft-preview.test.ts`, etc.) — these tests exercise other behavior (taxonomy, draft/publish flow, ticket rules) and are not age-restriction-specific assertions.

**No test exists** asserting: age is actually enforced against a purchasing/joining user (consistent with §58/§59 — nothing to test), or catching the `AboutTab.formatAgeLabel` wording divergence from the rest of the app (§53-56) — this specific display inconsistency has zero test coverage and would not be caught by any existing suite.

## 62. Exact Gaps

1. **Event Detail's age label wording diverges from the rest of the app.** File: `app/components/eventTabs/AboutTab.tsx:95-105` (`formatAgeLabel`). Impact: low-severity but real inconsistency — same event, different wording depending on surface (Map: `"18+"`; Event Detail: `"18+ only"`). Smallest fix: align `formatAgeLabel`'s output strings to the canonical `"All Ages"/"18+"/"21+"`.
2. **Feed and Search don't display age restriction at all**, though the requirement names them as surfaces requiring consistency. Files: `app/components/home/EventFeedCard.tsx`, `app/app/discover-screen/search.tsx`. This may be an intentional product/UX choice (not every card needs every field) rather than a bug — flagged as a product-decision question, not assumed to be wrong.
3. **No ticket-purchase or join/RSVP enforcement of age restriction exists**, and the user model lacks any verified age/DOB data to enforce against even in principle. Files: `api/src/modules/payments/*`, `api/src/modules/events/event.service.ts` (`submitJoinRequest` and neighbors), `api/src/modules/user/user.model.ts`. This is the largest gap against the literal requirement text ("enforced in ticket/join flows where the product currently requires age eligibility") — but since the product currently requires it *nowhere* (no flow gates on it today), this reads as a missing feature rather than a broken one. Needs a product decision on whether enforcement is actually expected, and if so, a DOB-collection mechanism would be a prerequisite before any real enforcement could be built.
4. **Independently duplicated age-option mapping** in `FilterModal.tsx` (§48) — currently correct, but a structural drift risk against the canonical `toAgeRestriction`/`fromAgeRestriction` source of truth.

---

## 63. Cross-Requirement Findings

**EVT-007 + EVT-008 (Part AK)**: The layout reorder needed for EVT-007 (§11 finding 1) is a pure JSX/style reorder — it does not touch `persistStepTwo`, `combineLocalDateAndTime`, `onStartDateChange`/`onEndDateChange`/`onStartTimeChange`/`onEndTimeChange`, or any store/validation code. Confirmed cleanly separable: the four `TouchableOpacity` blocks and their handlers are self-contained JSX fragments that can be reordered into different row groupings without altering which state variable each one reads/writes. No risk of accidentally swapping start/end values or breaking wall-clock conversion from a pure layout change, *provided* the existing `onPress`/`disabled`/value-bindings are moved together with their JSX blocks rather than re-typed.

**EVT-008 + EVT-009 (Part AL) — the most important cross-check, and it passes.** The codebase **does** explicitly distinguish "new event start must not be in the past" from "active existing event's historical start is valid and immutable" — this is not one shared rule. Frontend: `getEventStepTwoScheduleErrors`'s `if (!options.isOngoingEdit) { ...reject past... } else { ...compare against originalScheduledAt, only require endAt > now... }` (`eventStepTwoValidation.ts:82-109`) is an explicit branch. Backend: `assertOngoingEventScheduleUpdateAllowed` only activates for events matching the active window (§34) and has no "past start" rejection at all for the general case — the backend's only real gap (§17) is the *opposite* direction: it's missing the future-start check for *new* events, not incorrectly applying a *past*-start check to active ones. **This is not a P0 gap as feared by the task's own framing** — the distinction exists and works correctly; the actual P0 finding is elsewhere (new-event past-start has no backend enforcement at all, §17).

**EVT-002 regression (Part AM)**: Not exercised by this audit (audit-only, no code changed), but by inspection, `app/lib/eventWizardSteps.ts`'s `isEventWizardDetailsStepValid` (from the EVT-002 batch) checks only `hasStart`/`hasEnd` **presence**, not date-range or past-date validity — so if Details' schedule is deemed invalid by the *richer* checks audited here (e.g. past start on a new event, once fixed), the navigator's presence-only check would still mark Details "valid" as long as *some* start/end value exists, potentially at odds with a stricter backend rule. This is a latent interaction between EVT-002's deliberately-loose eligibility check and any future EVT-008 fix — not a bug today, but worth flagging: a backend-side past-start rejection (§17's suggested fix) would need to surface its error normally through the existing publish-error-alert path, not through the navigator, since the navigator was never designed to encode full temporal validity.

**EVT-005 regression (Part AN)**: Not touched or at risk — nothing in this audit examined or altered banner logic.

**EVT-003/ticket-payload regression (Part AO)**: Not touched or at risk — nothing in this audit examined or altered ticket serialization; `salesEnded`/`availableCount` were not encountered anywhere in the date/time/age code paths traced.

## 64. P0 Blockers

1. **New event can publish with a past start** (EVT-008, §17) — matches the task's own named P0 trigger ("new Event publishes with invalid past start") exactly, confirmed reachable via direct API call, not just a theoretical gap.

No other finding in this audit meets the task's stated P0 bar (end-before-start publishing, active-event start mutation, or materially-different-local-time across the *primary* display surfaces were all checked and found correctly guarded).

## 65. P1 Gaps

1. EVT-007's row-grouping mismatch (visual, not data-corrupting).
2. EVT-008's two device-local display surfaces (share sheet, reward claim) — real inconsistency, but confined to secondary surfaces, not the primary Feed/Detail/Map/Checkout path.
3. EVT-010's Event Detail wording divergence and missing Feed/Search display.
4. EVT-009's untested (but likely-safe) active-event-timezone-change interaction.

## 66. Unclear Product Decisions

1. Whether EVT-010's "enforced in ticket/join flows where required" implies the product actually wants real DOB-based enforcement built (a significant feature, needing new user data collection), or whether the current presentation-only behavior is an accepted, intentional scope boundary.
2. Whether Feed and Search are intentionally age-restriction-free surfaces (a deliberate "don't clutter the card" choice) or an oversight against the stated requirement.
3. Whether legacy (no-timezone) events' device-local edit-picker drift (EVT-008 §22) is considered acceptable technical debt or something a backfill should eventually address — out of scope for this audit either way.

## 67. Exact Files That Would Require Changes IF Fixes Are Pursued

- `app/app/create-event/step-2.tsx` — EVT-007 row reorder + time-text truncation guard; (indirectly) where a future backend past-start error would need to surface as a user-facing alert.
- `api/src/modules/events/event.validation.ts` — EVT-008 new-event past-start refine on `publishBody`.
- `app/app/event-screen/event.tsx` — EVT-008 fix the two device-local formatting call sites (share sheet, reward claim) to use `formatEventTimeDisplay`.
- `api/test/event-ticket-management.test.ts` — EVT-009 add the untested active-event-timezone-change test.
- `app/components/eventTabs/AboutTab.tsx` — EVT-010 align age-label wording.
- `app/components/home/EventFeedCard.tsx`, `app/app/discover-screen/search.tsx` — EVT-010 add age display, only if the product decision in §66.2 says to.
- `app/components/home/FilterModal.tsx` — EVT-010 de-duplicate the age-option mapping in favor of the canonical store functions.
- New: a DOB-collection field and checkout/join eligibility check — EVT-010 real enforcement, only if the product decision in §66.1 says to build it (large scope, not a small fix).

## 68. Safest Implementation Order (if fixes are pursued later)

1. EVT-010 AboutTab wording fix (zero risk, string-only).
2. EVT-008 device-local formatting fixes in `event.tsx` (contained, two call sites, no schema/validation change).
3. EVT-007 layout reorder + time-text truncation guard (contained to one screen's JSX/styles).
4. EVT-009 add the one missing test (test-only, zero production risk).
5. EVT-008 new-event past-start backend validation (needs product sign-off on the exact rule — e.g. is "now" the right boundary, or some grace window — before writing the Zod refine).
6. EVT-010 Feed/Search display + FilterModal de-duplication (requires the product decision in §66.2 first for the display part; the de-dup is safe either way).
7. EVT-010 real ticket/join enforcement — only after a product decision on DOB collection; largest scope, should not be bundled with anything else.

## 69. Final Recommendation

Prioritize the one confirmed P0 (EVT-008's new-event past-start gap, §64) — it's a narrowly-scoped backend Zod addition with low risk and high value. The two EVT-008 display-inconsistency call sites are cheap, safe follow-ups. EVT-007 and the EVT-010 wording fix are low-risk polish. EVT-009 needs no functional fix at all — only one additional test for full confidence. EVT-010's enforcement gap is a genuine product-scope question, not an engineering bug, and should not be built speculatively without an explicit decision on DOB collection.
