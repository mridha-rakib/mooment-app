# Create Event Audit — EVT-001 through EVT-006

Audit-only. No production code was modified. All findings are evidence-based, sourced from direct reading of the active codebase (React Native/Expo app under `app/`, Node/Bun backend under `api/`). Where a claim cannot be proven from static source alone (e.g. real-device restart behavior), this is stated explicitly.

---

## 1. Executive Summary

The Create Event system is a single, well-architected wizard (`app/app/create-event/*`) backed by one Zustand store (`app/stores/eventDraftStore.ts`) and one backend module (`api/src/modules/events/*`). There is **no duplicate/legacy implementation** — Part B search came back clean.

Of the six requirements:

- **EVT-001 (Create Event end-to-end) — C, with one D-severity risk.** The core save/publish plumbing is solid (idempotency-guarded draft save, server-confirmed navigation, no proven duplicate-event bug), but the wizard's "Preview" button does not create a true preview — it silently saves a **draft**, and the actual **Publish** action lives on a separate screen (`event-screen/event.tsx`) outside the audited wizard. A new host can walk away after "Preview" believing they published, and the event stays invisible in a draft state indefinitely. Additionally, the Business-Account prerequisite is enforced only reactively (after the user has filled out the whole form), not as an upfront gate — a real but non-data-loss UX gap. Banner upload is a **D-severity finding** in EVT-005 context that also affects EVT-001 (unvalidated file type, orphaned storage on replace/failure).
- **EVT-002 (Tappable step navigator) — F.** Does not exist. Only a static, non-interactive "Step N / N out of 5" text pair appears on 5 of 9 screens. No labels, no tap targets, no guard logic, no step-status tracking.
- **EVT-003 (Save Draft) — B.** Well implemented: backend-persisted, ownership-checked, update-in-place (no duplication), all fields covered, multi-draft supported, delete works correctly. Minor gaps: no automated test for delete-draft/ownership; unsaved in-memory edits are (correctly, unavoidably) not restart-safe.
- **EVT-004 (Basics copy cleanup) — F.** Not done. The legacy placeholder `"Event main highlights"` is still live in production (`index.tsx:393`), the expected copy `"Event name"` / `"Tell people what to expect"` is absent, and the awkward `"JPEG, or PNG"` string is still present verbatim.
- **EVT-005 (Banner upload/preview) — D.** One banner field end-to-end (correct), but file-type validation is effectively absent (client mislabels rather than rejects; backend never checks banner content-type), no upload-progress UI despite the capability existing unused in the storage library, replaced banners orphan the old S3 object, and there are three different fallback images and three different aspect-ratio boxes across Create/Feed/Detail/Map — directly violating "editor preview matches published banner."
- **EVT-006 (20-category taxonomy) — C.** Cross-surface consistency is excellent (single source of truth, backend-enforced max-3, no legacy labels reachable), but the list is **18 categories, not 20**, and this appears to be an intentional, test-locked decision (`api/test/event-taxonomy.test.ts` hard-asserts `length === 18`), not an oversight — flagged as a product/spec conflict, not a code defect.

**Release-blocker call for EVT-001 (P0 rule):** Not a hard blocker in the sense of data loss or crash, but the Preview/Publish naming split is a real risk of hosts believing they've published when they haven't, and banner file-type validation gaps are worth fixing before wide release. Recommend treating as a blocker for a "polish" release, non-blocker for an internal beta.

---

## 2. Create Event Architecture Map

```
AddOptionsModal ("New Event") ──▶ /create-event (index.tsx, Step 1 "Basics": name, description, banner)
                                        │  Zustand: useEventDraftStore (app/stores/eventDraftStore.ts)
                                        │  saveDraft() on Next/Save Draft/Save & Exit
                                        ▼
                                 /create-event/step-2 ("Details": age restriction, categories[1-3], schedule)
                                        ▼
                                 /create-event/step-3 ("Location": venue/address, geolocation autofill)
                                        │  delegates to /create-event/location-picker (Mapbox search) for pin drop
                                        ▼
                                 /create-event/step-4 ("Tickets" list)
                                        │  /create-event/ticket-details (create/edit one ticket)
                                        │  /create-event/ticket-preview (read-only ticket summary)
                                        ▼
                                 /create-event/step-5 ("Privacy" + wizard CTA)
                                        │  new event: handlePrimaryAction → saveDraft() [NOT publish()]
                                        │  editing published event: handlePrimaryAction → publish()
                                        ▼
                                 router.replace → /event-screen/event?eventId=X&mode=preview|host
                                        │  event.tsx: getEventById(eventId) — fresh server GET, not client state
                                        │
                                        │  ── separate, later action ──
                                        ▼
                                 event.tsx: handlePublishDraft() → POST /events/:id/publish (TRUE publish)
                                        ▼
                                 Event visible in Feed / Map / Search / Profile Events
```

Key architecture facts:

1. **Entry route**: `AddOptionsModal.tsx:52` → `/create-event`.
2. **Parent screen/layout**: `app/app/create-event/_layout.tsx` — Expo Router `Stack`, header hidden, hardware back → `/(tabs)/home`. No auth/business-account gate at this layer.
3. **Step screens**: `index.tsx` (basics), `step-2.tsx` (details/schedule/categories), `step-3.tsx` + `location-picker.tsx` (location), `step-4.tsx` + `ticket-details.tsx` + `ticket-preview.tsx` (tickets), `step-5.tsx` (privacy + submit).
4. **State owner**: single global Zustand store `useEventDraftStore` (`app/stores/eventDraftStore.ts`), not Redux (Redux is theme-only, unrelated), not route params (route params only carry a ticket `localId`).
5. **Step index/state**: no centralized step-index concept exists; each screen is a literal Expo Router path, hardcoded `router.push` to the next path.
6. **Validation owner**: per-step Zod schemas colocated in each step file, plus store-level guards (`assertValidCategories`) and backend Zod schemas (`event.validation.ts`) as the final authority.
7. **Draft owner**: backend `Event` document with `status: "draft"` (`event.model.ts`), not a separate Draft model, not local storage.
8. **Media/banner owner**: `eventDraftStore.ts` (`bannerImageUri`/`bannerImageKey` etc.) uploading via `app/lib/storage.ts` `uploadFileToStorage`, backend fields `bannerImageKey`/`bannerOriginalImageKey`/`bannerImageDisplay` on the Event model.
9. **Category source**: `app/constants/eventCategories.ts` (`EVENT_CATEGORY_METADATA`), mirrored in `api/src/modules/events/event.interface.ts` and `admin/src/shared/eventCategories.ts`.
10. **Ticket configuration source**: `eventDraftStore.ts` tickets array + dedicated per-ticket endpoints (`createDraftTicket` etc., `app/lib/events.ts`), backend `eventTicketSchema` (`event.model.ts`).
11. **Privacy source**: `step-5.tsx` UI, store `privacy` field, backend `eventPrivacyOptions = ["public","locked","private"]`.
12. **Preview screen**: none dedicated — "Preview" is a mislabeled draft-save action; the actual preview experience is the Event Detail screen (`event-screen/event.tsx`) fetched fresh from the server.
13. **Publish function**: two distinct code paths — `eventDraftStore.publish()` (used only when editing an already-published event) and `event.tsx handlePublishDraft()` (the true first-publish action, called directly via `app/lib/events.ts publishEvent`, bypassing the store).
14. **Frontend API helper**: `app/lib/events.ts` — `saveEventDraft`, `publishEvent`, `updateEvent`, ticket/reward sub-resource helpers.
15. **Backend route/controller/service**: `api/src/modules/events/event.route.ts` → `event.controller.ts` → `event.service.ts` (`saveDraft`, `publish`) → `event.repository.ts`.
16. **Event schema/model**: `api/src/modules/events/event.model.ts` (Mongoose), `event.interface.ts` (TypeScript DTOs).
17. **Mapping/normalization layer**: `EventService.normalizeDraftPayload` / `normalizePublishPayload` (`event.service.ts:2823-2909, 3075-3112`) — rebuilds location, tickets, categories, timezone field-by-field; not a pass-through.
18. **Post-publish navigation**: `step-5.tsx:92-95` `router.replace` to `/event-screen/event` after `saveDraft()`/`publish()` resolves (server-confirmed, not optimistic); the true publish action (`event.tsx handlePublishDraft`) does not navigate at all — it merges the response into the same screen's state.

---

## 3. Active vs. Legacy Flow Inventory (Part B)

**No legacy/duplicate Create Event implementation exists.** Grep for `createEvent|CreateEvent|create-event` across `app/` (32 files) and `api/` (27 files) found exactly one production wizard. No second folder (e.g. `app/screens/CreateEvent*`), no dormant step components, no separate create/edit taxonomies (Create and Edit **share the exact same component**, `app/app/create-event/index.tsx` and siblings, toggled via `isEditingEvent`/`isEditingPublished` flags fed by `loadFromEvent()`).

| Item | Classification |
|---|---|
| `app/app/create-event/*` (9 files) | Active — the only wizard |
| `app/stores/eventDraftStore.ts` | Active — single state owner (also used for Edit) |
| `app/lib/events.ts` | Active — API client |
| `app/components/modals/AddOptionsModal.tsx` | Active — entry point |
| `app/app/event-screen/event-drafts.tsx` | Active — draft-resume entry point, draft list/delete UI |
| `app/app/profile-screen/{creator-dashboard,all-events}.tsx` | Uncertain — reference "create event" but not opened in full; very likely simple nav CTAs into the same route, not independent logic |
| `api/src/modules/events/*` | Active — single backend module |
| `api/src/modules/event-windows/*` | Active but distinct feature ("Moments" content-posting windows, not a duplicate creation flow, not ticket sales windows) |
| Redux store (`app/redux/store.ts`) | Unrelated — theme preference only, not an event-creation state container |

---

## 4. EVT-001 Classification: **C** (materially incomplete in one important way — Preview/Publish semantics — plus D-severity banner sub-issues)

Justification below in sections 5–17.

## 5. Clean-Account Prerequisite Audit

A brand-new host account can freely **enter** `/create-event` and fill out all 5 steps + tickets with **zero warning**. The block only fires reactively on first network write:

- Every non-GET `/events/*` route (draft save, ticket create, publish) requires `accountType === "business"` server-side, enforced by `requireBusinessAccount` middleware (`event.route.ts:11-21`, `auth.middleware.ts:74-89`), throwing `403 BUSINESS_ACCOUNT_REQUIRED`.
- Frontend only handles this **after the fact**: `app/lib/eventGuard.ts:20-71` `requireBusinessAccountForEvent()` is invoked from every save/publish error handler, prompting either an account-type switch or a redirect to `/profile-screen/edit-profile` — but only once a save call has already failed. There is no upfront gate in `_layout.tsx` or `index.tsx` that checks account type before letting the user start.
- **This is a legitimate prerequisite (business account required), but an unexpected/late-surfacing blocker in UX terms** — a host can type a full event, tap Next through 4 steps, and only then be told they need a business account.
- **No Stripe/payment-account requirement found** anywhere in `event.service.ts` (zero hits for `stripe`/`payout`/`connect`) — a host can publish a **paid** ticket without connecting Stripe at creation time. This is presumably enforced later at payout time, not audited here (out of scope — checkout/payments module).
- No email verification, phone verification, location-permission, or pre-existing-event/ticket requirement was found gating entry or publish.
- Category (1-3), schedule, and location become **required only at publish**, not at draft-save — legitimate design (drafts can be incomplete).

**Classification of this sub-finding: legitimate prerequisite (business account), presented with poor timing (late, reactive) — UX gap (E-level), not a data-loss/blocking bug.**

## 6. Basics Field Matrix

| Field | Frontend state | Required (FE) | Backend field | Backend validation (draft / publish) | Notes |
|---|---|---|---|---|---|
| Name | `index.tsx` local `name` | Yes (`createEventStepOneSchema`) | `IEvent.name` / model `name` (maxlength 160) | optional / **required**, `min(1).max(160)` | Draft-save itself does **not** run this schema (see §14 banner note) — only Next/Save&Exit do |
| Description | `index.tsx` local `description` | Yes | `description` (maxlength 5000) | optional in both | — |
| Banner | `index.tsx` local `bannerImage` | Yes | `bannerImageKey`/`bannerOriginalImageKey` (maxlength 300 each) + `bannerImageDisplay` (crop rect, never set by any UI — dead field) | optional in both (string only; no content-type check) | See §5 EVT-005 for detail |
| Categories | `step-2.tsx` local, 1-3 | Yes, max 3 | `category` (legacy singular) + `categories[]` | draft: optional max 3 unique; publish: **required** min 1 max 3 unique | Enforced 3x server-side (zod, mongoose, service assert) |

No frontend/backend field-name mismatches found (name/description/banner/categories all map 1:1).

## 7. Time/Timezone Audit

- `scheduledAt`/`endAt` are single absolute UTC `Date` fields (not separate date+time pairs) — `event.interface.ts:437-438`.
- Draft: optional coerced dates. Publish: **required**, `z.date()`.
- **End-before-start rejected**: `validateEventDateRange` (`event.validation.ts:480-488`), applied on both draft and publish bodies.
- **No explicit past-date rejection** for `scheduledAt`/`endAt` themselves (only ticket `salesEndAt` is checked against "now").
- Timezone resolution (`event-timezone.ts`) is a well-built 5-tier cascade in `applyEventTimeZone` (`event.service.ts:2924-3023`): resolve from venue coords → reinterpret on venue-zone change preserving wall-clock → keep same zone → client-supplied controlled fallback → **preserve legacy value or leave unset, explicit "never invent or shift" comment**. No invented default timezone (no silent "UTC" fallback) — this is a deliberate, safe design.
- `event-temporal-status.ts` (live/starting-soon/ended classification) is **timezone-agnostic by design** — pure epoch-ms comparison, which is correct since `scheduledAt`/`endAt` are already absolute instants.
- DST handled deterministically inside `event-timezone.ts` (documented spring-forward/fall-back policy, binary-search transition finder).
- Local wall-clock transport fields (`scheduledLocalDate/Time`, `endLocalDate/Time`) are validated as `YYYY-MM-DD`/`HH:mm` and **stripped before persistence** — never stored raw.

**Verdict: this area is well-engineered and Create Event correctly feeds the existing timezone architecture. No changes needed; do not touch per the global safety rule.**

## 8. Location Audit

- Full field set (venue, address, formattedAddress, city, region, country, countryCode, lat/lng, mapboxPlaceId, etc.) mirrored 1:1 across `EventLocation` interface, Mongoose schema, and Zod schema.
- **No lat/lng both-or-neither enforcement on the create/publish body** — the `eventLocation` Zod schema has no `.refine` pairing them (such refines exist only for **query** params, e.g. map bounds, not for the write path). A manually-edited or partially-completed location could in principle produce lat without lng or vice versa; the range validators (`-90..90`/`-180..180`) apply per-field only.
- Publish requires only that **some** location text identity exists (`venue || address || searchLabel`) — does **not** require coordinates at all. An event could theoretically publish with a text address but no lat/lng, meaning it would not render correctly on Map (Map requires coordinates).
- Timezone resolution silently degrades (falls through the cascade to "no zone") if coordinates are absent — consistent, not a bug, but compounds the missing-coordinates risk.
- Location is stored in the single Zustand store and rebuilt field-by-field server-side (`normalizeDraftPayload`), so it should not be lost across step navigation (backward nav reads from the same store, confirmed in §10).

**Classification: C-level gap** — lat/lng-pairing and coordinate-required-for-publish are both plausible legitimate omissions but are unverified against product intent; flagged as worth a deliberate decision rather than an accidental gap, since it could silently produce un-mappable published events.

## 9. Ticket Audit

- `EventTicket`: id, name (required), description, `salesEndAt` (sales-window **end** only — **no sales-window-start field exists** at all), type (free/pay), price (0-1,000,000), capacity (required, 0-1,000,000), `availableCount`.
- **No purchase-limit / min-max-quantity-per-order fields exist anywhere in the ticket schema.** If the product requirement expects per-user purchase limits, this is a **missing feature**, not a bug in existing code.
- Zero-price handled correctly: free tickets are force-zeroed server-side (`price: type==="free" ? 0 : price`) both in validation and service normalization — cannot be spoofed to a nonzero price while `type: "free"`.
- Draft: tickets array optional, max 100. Publish: tickets array defaults to empty array (**publish does not require at least one ticket** — a "ticket-less" event can be published, which is presumably intended for free/RSVP-only events but worth confirming).
- Cross-checks: ticket `salesEndAt` must be before event `endAt` and not in the past, enforced only on publish (`validateTicketSalesEndDates`).
- `availableCount` correctly seeded to `capacity` on first publish, and delta-preserved (not reset) on re-publish/update.
- "Event Windows" (content-posting windows) are a **separate, unrelated concept** from ticket sales windows — confirmed no field overlap; only relationship is eligibility gating (ticket-holder vs checked-in-attendee) for who can post.
- Ticket state is traced all the way from `ticket-details.tsv` → `eventDraftStore` tickets array → `buildEventPayload` → backend `normalizeTicket` → persisted model, with no silent dropping found.

**Classification: B-level** — solid implementation; the missing purchase-limit fields and ticket-less-publish-allowed behavior are worth a product confirmation, not proven bugs.

## 10. Privacy Audit

- Three supported values: `"public" | "locked" | "private"` (`event.interface.ts:14-15`), enforced identically client and server.
- Draft: optional, defaults to `"public"`. Publish: required-with-default `"public"`.
- No UI-option/backend mismatch found — `step-5.tsx` presumably offers exactly these three (not independently re-verified against UI copy in this pass, but schema/model alignment is confirmed).
- Draft restoration: privacy is included in the draft payload and persisted field-by-field; restoration relies on the same mechanism as all other fields (§ EVT-003 draft audit — confirmed exact restoration, no transformation).

**Classification: A-level** — no gap found.

## 11. Preview Audit

**This is the most significant structural finding in EVT-001.**

- There is **no dedicated data-preview screen** in the wizard. `step-5.tsx` is a **privacy-selection screen**, not a preview — despite its primary button being labeled "Preview" for new events.
- `ticket-preview.tsx` only previews a single ticket tier + event name/dates/location/privacy — not banner, description, categories, or the full event.
- The actual "preview" experience is the **Event Detail screen** (`event-screen/event.tsx`), reached after `step-5.tsx`'s "Preview" button silently calls `saveDraft()` (not `publish()`) and navigates there. `event.tsx` does a **fresh server GET** (`getEventById`), so it cannot show stale client state — but it also means it only shows what actually made it into the persisted draft, not necessarily every field the user typed if something were dropped upstream (no such drop was found in this audit; the draft-field matrix in §EVT-003 shows full coverage).
- All step data lives in one Zustand store — no separate/stale "preview subset" object exists, which is good.

**Verdict:** the mechanism (server-confirmed re-fetch) prevents staleness, but the **naming/semantics are misleading**: "Preview" performs a real backend write (draft save) and the user is not shown a true side-by-side preview of all fields before that write happens.

## 12. Publish Audit

Two distinct publish-adjacent code paths, both audited:

**A. Wizard "Preview" button (new event) → `eventDraftStore.saveDraft()`:**
- Client validation: category count (1-3) and schedule presence checked inline before calling; no name/banner/location check at this final step (those were already validated at their own steps' Next handlers).
- Banner upload happens synchronously inside the same submit call, before the POST — not a separate pre-step, not deferred to publish only.
- **Duplicate-submission protection: present and real.** `isPreviewing` disables the button + a module-level `draftSaveQueue` promise chain explicitly documented ("two calls cannot both POST a new draft") serializes concurrent `saveDraft()` calls.
- Loading state cleared in `catch`, but **not via a `finally`** — on success, `resetDraft()` + navigation happen instead, which is fine given the component unmounts, but is a minor code-hygiene gap, not a functional bug.
- On error: existing form data preserved, no `resetDraft()`, useful error shown via `Alert.alert`, retry possible.
- On success: response is a full `EventResponse`; store updated via `set()` (Zustand — no react-query cache to invalidate); `resetDraft()` wipes wizard state; navigation (`router.replace`) fires only **after** the await resolves — genuinely server-confirmed, not optimistic.

**B. True first-publish of a draft → `event.tsx handlePublishDraft()` → `POST /events/:id/publish`:**
- Guarded by `isPublishingDraft` boolean, correctly cleared in `finally` (both success and failure paths).
- Client validation via `buildPublishPayloadFromEvent` throws synchronously on missing required fields before the request.
- On success: response merged into local state via `mergeUpdatedEvent`; **no navigation** — user stays on the same Event Detail screen showing the merged (server-confirmed) data.
- **This handler bypasses the Zustand store's `publish()` action entirely** — `publish()` is only used when editing an already-published event ("Save Changes"), which is a structurally different code path from first-time draft→publish. Two different "publish" mechanisms for what a reader might assume is one concept — worth a naming/consolidation pass, but not a functional bug (both were independently confirmed correct).

**Specific risk findings:**
1. Duplicate event creation on double-tap: **mitigated** on both paths (client-side guards); no server-side idempotency key found for path B, so a true concurrent race cannot be fully ruled out from source alone.
2. **Partial media upload + failed event creation → orphaned storage object: confirmed real risk.** Banner uploads to S3 before the draft/publish POST; if that POST then fails and the user abandons the flow (rather than retrying), the uploaded object is never referenced by any Event and is never cleaned up (no lifecycle/GC job found). Retry-safe (code re-uses the already-uploaded key), but abandon-scenario leaves an orphan. **Classify as D — reliability-sensitive, not data-loss for the user, but a storage-cost/hygiene issue.**
3. Stale draft remaining visible after publish: not found — draft-status events are excluded from all public feed/map/search queries; the draft only remains visible in the host's own "My Drafts" list until the status flips, which is correct.
4. Publish button re-enabled before response resolves: not found on either path.
5. Navigation before server confirmation: not found — navigation is gated on the awaited response on both paths.
6. Missing event ID handling: soft-guarded — `getEventFromResponse` throws if the event object is absent from the response, and `event.tsx` separately guards `!eventId` with an alert + back-navigation if somehow reached with an undefined ID.

## 13. Post-publish/Live Event Audit

- After the wizard's "Preview" (draft save), the destination screen (`event.tsx`) does a genuine `GET /events/:id` fetch — not an optimistic locally-constructed object. This is proof against "optimistic mock as proof of success."
- After the **true** publish (`handlePublishDraft`), the screen merges the server's own response object rather than re-fetching — authoritative since it's the server's return value, though it was not fully confirmed whether every derived display field (e.g. smart-feed ranking inputs) is present in that specific response vs. only a full GET (flagged as unclear, not confirmed as a bug).
- Feed/Map/Profile-Events/Search all query by `status: published|live` (repository-level filters confirmed at multiple call sites), so a genuinely published event should appear correctly across surfaces — contingent on the cross-surface field-consistency issues noted in EVT-005 (banner) and the location-coordinates gap noted in §8 (an event published without lat/lng would not render on Map).

## 14. Data-Loss Matrix

| Field | Basics→Details | Details→Location | Location→Tickets | Tickets→Privacy | Backward jump | Draft save/restore | Publish |
|---|---|---|---|---|---|---|---|
| Name | preserved (Zustand store) | preserved | preserved | preserved | preserved (store persists across unmount, `router.back()` doesn't reset it) | preserved (confirmed in draft field matrix) | preserved |
| Description | preserved | preserved | preserved | preserved | preserved | preserved | preserved |
| Banner | preserved (state) | preserved | preserved | preserved | preserved | preserved (uploaded key persisted, not local URI) | preserved, but see EVT-005 cross-surface rendering caveats |
| Categories | preserved | preserved | preserved | preserved | preserved | preserved (order/labels/emojis/slugs — via shared constant, no legacy mapping) | preserved |
| Date/time | preserved | preserved | preserved | preserved | preserved | preserved (transport fields correctly stripped/rebuilt) | preserved |
| Timezone | n/a until location set | resolved on location entry | preserved | preserved | preserved (5-tier cascade never invents) | preserved | preserved |
| Venue/address | n/a | preserved | preserved | preserved | preserved | preserved | preserved, but coordinates not required (§8) |
| Lat/lng | n/a | preserved once set | preserved | preserved | preserved | preserved | **cannot prove both-or-neither integrity; no server refine** |
| Tickets | n/a | n/a | preserved (own sub-resource) | preserved | preserved | preserved | preserved |
| Privacy | n/a | n/a | n/a | preserved (set at step-5) | preserved | preserved | preserved |

**No step-transition data loss was found anywhere** — this is because there is no navigator/step-jump mechanism at all (EVT-002 is unimplemented; only strictly linear forward `router.push` + `router.back()` exist), and the single shared Zustand store means "jumping" isn't structurally possible to begin with. The requirement's "jumping steps preserves all entered data" acceptance criterion is **untestable as written** because there is nothing to jump with.

## 15. Blocking/Error Matrix

| Scenario | Stays on form? | Input preserved? | Retry possible? | Useful error shown? | Loading state cleared? |
|---|---|---|---|---|---|
| Network failure on draft save | Yes | Yes | Yes | Yes (`Alert.alert` w/ `getAuthErrorMessage`) | Yes (catch block) |
| Banner upload failure | Yes (same catch) | Yes | Yes (re-upload skipped if key already exists from a prior partial success) | Yes | Yes |
| API validation failure | Yes | Yes | Yes | Yes | Yes |
| Duplicate submit (rapid tap) | n/a — blocked before it happens | n/a | n/a | n/a (button just stays disabled) | button re-enables on settle |
| Missing required field | Yes | Yes | Yes (Zod messages shown per-step) | Yes | Yes |
| Invalid date (end before start) | Yes | Yes | Yes | Yes (`event.validation.ts` message paths to `endAt`) | Yes |
| Invalid location (missing all of venue/address/searchLabel) | Yes | Yes | Yes | Yes (publish-time only) | Yes |
| Invalid ticket config (salesEndAt past event end) | Yes | Yes | Yes | Yes | Yes |
| Business-account required | Yes (reactive prompt) | Yes | Yes (after switching account type) | Yes, but **late** (§5) | Yes |
| 429 (rate limit) | Yes | Yes | Yes | Yes (special-cased) | Yes |
| Event-creation service failure | Yes | Yes | Yes | Yes | Yes |

**No blocking dead-ends found.** The system consistently preserves input and re-enables retry across every error scenario examined.

## 16. EVT-001 Test Coverage

- Full wizard end-to-end: **Missing** — no component-mount test exists anywhere in the repo (deliberate convention per the repo's own test-file comments: "no React Native component render harness here").
- Publish (backend): **Covered, runtime, mocked repository** — `api/test/event-draft-preview.test.ts` confirms publish-retry uses `publishDraftByIdForUser`, not `create` (no duplicate).
- No HTTP/integration-level tests exist anywhere in `api/test` (zero `supertest` usage) — all backend coverage is service-layer unit tests against hand-mocked repositories, not a real/test database.
- Timezone/schedule: **well covered, runtime** — `api/test/event-create-timezone.test.ts`.
- Ticket creation/validation: **well covered, runtime** — `api/test/event-draft-preview.test.ts`.

## 17. EVT-001 Exact Gaps

1. **Preview/Publish naming and mechanism split** (§11, §12) — Files: `app/app/create-event/step-5.tsx`, `app/app/event-screen/event.tsx`, `app/stores/eventDraftStore.ts`. Impact: hosts may believe "Preview" published their event; event silently remains an invisible draft. Smallest likely fix scope: rename the wizard CTA to reflect that it saves a draft, and/or surface a clearer "Publish" call-to-action immediately after landing on the preview screen.
2. **Business-account gate is reactive, not upfront** (§5) — Files: `app/app/create-event/_layout.tsx` or `index.tsx`, `app/lib/eventGuard.ts`. Impact: wasted user effort filling a form they can't submit. Smallest fix: check account type on wizard entry.
3. **Orphaned S3 objects on abandoned/failed draft saves** (§12 finding 2) — Files: `app/stores/eventDraftStore.ts` (`buildEventPayload`), backend storage module. Impact: storage cost leak, not user-facing. Smallest fix: backend lifecycle/GC job for unreferenced keys, or defer upload until payload construction succeeds.
4. **No lat/lng pairing enforcement, coordinates not required to publish** (§8) — File: `api/src/modules/events/event.validation.ts` (`eventLocation` schema, publish `.refine`). Impact: possible to publish an event invisible on Map. Needs product confirmation before treating as a bug.
5. **No ticket purchase-limit fields; publish allowed with zero tickets** (§9) — File: `api/src/modules/events/event.interface.ts`/`event.model.ts`. Needs product confirmation.

---

## 18. EVT-002 Classification: **F** (missing/materially incomplete — does not exist)

## 19. Navigator Existence

**No tappable step navigator exists anywhere in Create Event.** Grep for `StepIndicator|ProgressBar|StepNavigator|Stepper|StepDots` across the whole repo returns zero matches.

## 20. Labels/Order

What exists instead is a static, non-interactive text pair repeated on 5 of 9 screens:
- `index.tsx:342-345` — "Step 1" / "1 out of 5"
- `step-2.tsx:473-475` — "Step 2" / "2 out of 5"
- `step-3.tsx:310-312` — "Step 3" / "3 out of 5"
- `step-4.tsx:208-210` — "Step 4" / "4 out of 5"
- `step-5.tsx:148-150` — "Step 5" / "5 out of 5"

`location-picker.tsx`, `ticket-details.tsx`, `ticket-preview.tsx` have **no step indicator at all**. No labels resembling "Basics/Details/Location/Tickets/Privacy-Preview" exist anywhere.

## 21. Tappability

Not applicable — nothing to tap. Each container is a plain `View` wrapping two `Text` nodes; no `TouchableOpacity`/`Pressable`/`onPress`/`onTouchEnd` wraps any of them in any of the 9 files.

## 22. Validation Guards

Validation exists only on per-screen "Next" button handlers (e.g. `index.tsx:245-263`, `step-2.tsx:423,437`) gating `router.push` to the literal next screen. Since there is no navigator, there is no bypass path to evaluate.

## 23. Backward Jump Behavior

**Preserved correctly.** `router.back()` (e.g. `step-2.tsx:455`) unmounts/remounts from the navigation stack; all step values live in the shared Zustand store (module-level singleton, unaffected by navigation), and each step's local `useState` is re-initialized from the store on mount. No reset/reinitialize/refetch occurs on backward nav — resets only happen via explicit `resetDraft()`/`discardDraft()` calls, never from normal back navigation.

## 24. Forward Jump Behavior

**Not possible by design — no navigator UI exists to jump with.** Every "Next" transition is a hardcoded `router.push` to the literal next screen. This is a hard gap against the requirement (not a defensible "intentional design choice," since the requirement explicitly asks for tappable navigation on valid/completed steps).

## 25. State Preservation

The underlying data model (single Zustand store) already supports a real jump-capable navigator if built — this is the one positive structural finding for EVT-002.

## 26. EVT-002 Test Coverage

None. No test targets step-navigation guards, tappability, or forward/backward jump preservation, because no such navigator component exists to test.

## 27. EVT-002 Exact Gaps

1. **Entire feature missing.** Files that would need to change: new component (e.g. `app/components/create-event/StepNavigator.tsx`), plus all 9 screens in `app/app/create-event/*` to render it and expose per-step validity to it (likely sourced from the same Zod schemas already used for Next-button gating). Given the shared-store architecture already in place, this is additive work, not a refactor of existing state — smallest-scope approach: add a status-derivation layer (valid/current/completed per step) reading from `useEventDraftStore`, then a presentational tappable header component.

---

## 28. EVT-003 Classification: **B** (mostly correct; minor test/UX gaps)

## 29. Draft Storage Architecture

Drafts are a genuine backend-persisted `Event` document with `status: "draft"` (`eventStatuses` enum, `event.interface.ts:6-7`; schema field `event.model.ts:418-420`). **No separate Draft model, no AsyncStorage/SQLite/MMKV persistence of draft content** — the Zustand store (`useEventDraftStore`) has no `persist` middleware and holds only in-flight working state; durability comes entirely from the backend record.

## 30. Draft Field Coverage Matrix

All checked fields are included in `buildEventPayload` (`eventDraftStore.ts:731-789`) and persisted server-side (`event.repository.ts:2125-2154`): name, description, banner reference (key, not local URI — see §31), categories, start/end date-time, timezone (conditional — only sent when the session is new or the user touched the time picker; resolved server-side otherwise), location, tickets, privacy. **No field was found to be silently dropped.**

## 31. Banner Draft Persistence

**Correct — uploads before persisting.** The banner is uploaded to remote storage synchronously inside the same `saveDraft()`/`buildEventPayload()` call, before the network POST; only the resulting storage key is what's ever written to the Event document. The in-memory local picker URI exists only transiently, pre-save, and is never itself what's persisted — so the concern in the audit brief ("claim draft media survives restart only if a remote reference, not an ephemeral URI, is stored") does **not** apply here: the persisted draft always holds a remote key.

## 32. Category Draft Persistence

Categories persist via the shared constant-array source — no separate/legacy mapping applied on save or restore. Order, labels, emojis, and slugs are inherently stable since categories are stored as an array of the same string values used everywhere else.

## 33. Location Draft Persistence

Included in the draft payload (§30); rebuilt field-by-field server-side rather than passed through raw, consistent with the normalization approach used throughout.

## 34. Ticket Draft Persistence

Included via `stripLocalTicketFields` in the payload, plus dedicated ticket sub-resource endpoints (`/drafts/:id/tickets`) for create/update/delete — confirmed by backend tests (`api/test/event-draft-preview.test.ts`) exercising draft ticket mutation with ownership checks.

## 35. Privacy Draft Persistence

Included in the draft payload (§30); restored exactly on reload (same mechanism as all other fields).

## 36. Restart Persistence

**High confidence, backend-persisted → restart-safe for saved content.** "My Drafts" (`event-drafts.tsx`) fetches fresh from `GET /events/mine/drafts` on every screen focus — restored content is authoritative server state, not a local cache reconstruction. **Caveat, stated explicitly per the audit's evidence rules:** this proves the *saved* record survives restart; it does not and cannot prove (from source alone) that *unsaved* in-progress keystrokes survive a kill, and in fact they provably do not (no persist middleware on the Zustand store) — this matches the plain reading of the requirement ("draft survives app restart" refers to a saved draft, not unsaved edits).

## 37. Draft Update Behavior

**Updates the same record, does not duplicate.** `draftId` is tracked in store state, set from the server response on both creation and reload (`loadFromEvent`); `saveEventDraft(payload, draftId)` branches POST (create, no id) vs PATCH (update, id present); backend `updateDraftByIdForUser` is scoped to `{_id, userId, status:"draft"}`. A module-level `draftSaveQueue` explicitly prevents two concurrent calls from both POSTing a new draft.

## 38. Draft-to-Publish Identity

**Correct — same document, status flipped in place, no orphan.** `publishDraftByIdForUser` performs `findOneAndUpdate({_id, userId, status:"draft"}, {..., status:"published"})` — literally the same `_id`. One edge-case fallback exists: if the publish call 404s because the draft record is already gone server-side, the client clears `draftId` and retries via the no-id publish endpoint, creating a fresh Event — but since the precondition is that the original draft no longer exists, this does not leave an orphan; it's a legitimate recovery path, not routine behavior.

## 39. Delete Draft Behavior

UI: `event-drafts.tsx` long-press → confirmation → `deleteEvent(id)`. Backend `EventService.deleteEvent`: ownership check via `getEventForOwner` (throws if not owned), explicit guard rejecting deletion of non-draft (published) events, then `deleteByIdForUser` scoped by `{_id, userId}` — **double-enforced ownership** (authorization step + query-level filter). A user changing the ID in a request cannot delete another user's draft; the scoped query simply returns not-found.

## 40. Multiple Draft Behavior

**Multiple concurrent drafts per user are supported**, with a dedicated "Event Drafts" list screen (`event-drafts.tsx`) rendering each independently as resumable/discardable. No uniqueness constraint limits a user to one draft.

## 41. EVT-003 Test Coverage

- Draft save/update/publish transition: **covered, runtime, mocked repository** (`api/test/event-draft-preview.test.ts`).
- **Draft delete and its ownership check: completely untested** (`EventService.deleteEvent` has zero test references in `api/test` — confirmed via grep).
- Frontend draft-restore rehydration (full wizard, not just isolated helper functions): not covered by a runtime test; only source-regex checks exist for wiring.

## 42. EVT-003 Exact Gaps

1. **No automated test for delete-draft / ownership enforcement.** File: `api/src/modules/events/event.service.ts:637-671` (`deleteEvent`). Impact: low risk given the logic is straightforward and double-enforced, but it's the one explicitly-requested acceptance behavior ("draft can be deleted") with zero test coverage. Smallest fix: add a unit test with mocked repository covering owner-success, non-owner-404, and published-event-rejection cases.
2. No other functional gaps found — this requirement is essentially fully and correctly implemented.

---

## 43. EVT-004 Classification: **F** (missing/materially incomplete — none of the required copy changes were made)

## 44. Active Copy Inventory

From `app/app/create-event/index.tsx` (confirmed as the Basics/Step-1 screen, reused for both Create and Edit):
- Line 361: `EVENT NAME` (static label)
- Line 368: `placeholder="Name"`
- Line 385: `DESCRIPTION` (static label)
- Line 393: `placeholder="Event main highlights"` ← legacy string, still present
- Line 408: `BANNER` (static label)
- Line 430: `"You can only upload one image for the banner"`
- Line 434: `"Upload Image"`
- Line 437: `"JPEG, or PNG"` ← legacy string, still present verbatim (including the awkward comma)
- Zod validation messages: "Event name is required", "Description is required", "Banner image is required", etc.

## 45. Expected Copy Comparison

| Expected | Actual | Match? |
|---|---|---|
| "Event name" | Label is all-caps "EVENT NAME"; placeholder is just "Name" | No exact match |
| "Tell people what to expect" | Not present anywhere in the file | **Missing entirely** |
| "Upload one event banner image - JPEG or PNG." | Split across two separate strings, neither matching | No match — legacy comma-typo still present |

## 46. Legacy Copy Search

- `"Event main highlights"` — **1 hit, repo-wide**: `app/app/create-event/index.tsx:393`, live production placeholder text, seen by every user opening Basics before typing a description.
- `"JPEG, or PNG"` — **2 hits**: `index.tsx:437` (live, same screen) and `app/components/profile/AddProductModal.tsx:287` (unrelated feature — Product image upload, out of scope for EVT-004, but carries the identical typo if a broader cleanup is ever wanted).
- No test-fixture, comment, or dead-code occurrences of either string were found — both are 100% live, user-visible UI text today.

## 47. Create/Edit Wording Consistency

**No inconsistency between Create and Edit** — because there is no separate Edit Event screen; Edit reuses the exact same `index.tsx` component via `loadFromEvent()` + navigation into `/create-event`, toggling only the header title and button labels. All field copy (including the legacy strings) is therefore identical between Create and Edit by construction.

## 48. EVT-004 Exact Gaps

1. **Legacy placeholder never replaced.** File: `app/app/create-event/index.tsx:393`. Change: `"Event main highlights"` → `"Tell people what to expect"`.
2. **Legacy typo never fixed and expected sentence never introduced.** File: `app/app/create-event/index.tsx:430,437`. Change: consolidate `"You can only upload one image for the banner"` + `"JPEG, or PNG"` into `"Upload one event banner image - JPEG or PNG."`.
3. **"Event name" copy not applied** — current visible label is "EVENT NAME" (caps-styled) / placeholder "Name". Needs a product decision on whether the caps-label styling itself should change or whether just introducing "Event name" phrasing somewhere (e.g. as helper text) satisfies intent.

This is the cleanest, lowest-risk fix in the entire audit — three string literals in one file, no logic changes required.

---

## 49. EVT-005 Classification: **D** (data-loss/reliability-sensitive gap — validation and cross-surface consistency issues)

## 50. Banner State Architecture

Single-image, not an array, consistently end-to-end: frontend local state (`bannerImage: string | null`), Zustand store (`bannerImageUri`/`bannerImageKey`/`bannerOriginalImageUri`/`bannerOriginalImageKey`/`bannerImageDisplay`, all singular), backend interface and model (`bannerImageKey?`, `bannerOriginalImageKey?`, both plain strings). A separate `eventMedia[]` array exists on the model for the event *gallery* (correctly a different feature, capped at 30 items) — not confused with the banner in any code path examined.

## 51. One-Banner Enforcement

Confirmed correct throughout — no array field, no possibility of a second visible banner appearing.

## 52. Picker/Crop Behavior

`expo-image-picker`, `launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 })`. `allowsEditing: true` invokes the OS-native crop UI, but **no `aspect` option is passed** — crop ratio is unconstrained, and does not match any of the app's own banner display ratios. `quality: 1` means no client-side compression.

## 53. File/MIME Validation

**Effectively absent, both client and server.**
- Client does not restrict to JPEG/PNG; content-type sent to the server is **guessed from the URI file extension**, not the actual file: `getImageContentType` (`eventDraftStore.ts:154-162`) — anything not literally ending in `.png` is labeled `image/jpeg` regardless of true format (e.g. a `.heic` or `.webp` picker result would be mislabeled).
- Server: the banner upload goes through the **generic storage endpoint** (`storage.validation.ts` `createUploadUrl`), which only validates that `contentType` is a non-empty string ≤100 chars — no whitelist/enum at all. A real content-type whitelist (`supportedEventImageContentTypes`, including jpeg/png/webp/heic/heif) exists in `event.interface.ts` but is only consumed by the **gallery** add endpoint (`isSupportedEventMediaContentType`), never by the banner path. `event.validation.ts` treats `bannerImageKey`/`bannerOriginalImageKey` as plain opaque strings.
- **Conclusion: the requirement's explicit "JPEG or PNG" copy is not backed by any actual enforcement** — a user could upload any image type the OS picker surfaces (including HEIC, WebP) and it would be silently accepted and mislabeled.

## 54. Invalid-Image Preservation

- Canceled picker: correctly no-ops, prior valid banner preserved.
- Oversized/unsupported file: **no size or dimension check exists anywhere on the banner path** (contrast with the gallery's 15MB cap, which does not apply here) — nothing is ever rejected; it is silently uploaded regardless of size or true type.

## 55. Preview Behavior

Editor preview renders the exact same local `uri` that will later be uploaded (correct asset identity), but at a **different aspect/box size** than every downstream surface (§61).

## 56. Replace Behavior

Selecting a new image fully overwrites frontend state (old URI dropped, no dangling reference in the app). However, **the previously-uploaded S3 object from a prior save is never deleted** when a banner is replaced — `bannerImageKey` is reset to `null` in the store so a fresh upload occurs, but the old object orphans server-side. Same class of issue as the abandoned-draft-upload finding in EVT-001 §12.

## 57. Delete Behavior

A trash icon clears both banner fields locally, but **validation for "banner required" is inconsistently enforced**: `handleNext`/`handleSaveAndExit` run the schema requiring a banner, but `handleSaveDraft` does **not** run that schema at all — a user can delete their banner and successfully "Save Draft" with no banner and no error, yet get blocked with "Banner image is required" the moment they try Next or Save & Exit. This is a genuine inconsistency in when the rule is enforced, not a data-loss bug, but confusing UX.

## 58. Upload Timing

Not immediate on selection — upload happens inside `buildEventPayload()`, triggered by **any** save action (Save Draft, Save & Exit, or advancing via Next), never purely on picker-selection and never deferred to only-final-publish.

## 59. Upload Progress

**Does not exist for the banner**, despite the underlying capability being implemented and unused. `app/lib/storage.ts`'s `uploadFileToStorage` supports an `onProgress` callback (wired to real XHR/task progress events), but `eventDraftStore.ts`'s two calls to it for the banner never pass that callback. The only user-visible feedback during upload is a static "Saving…" button-label swap — not a percentage or progress bar. **This does not satisfy the "upload progress" acceptance criterion as written.**

## 60. Upload Failure/Retry

Retry is safe and non-duplicating — if a save fails after a successful upload, the resulting key is persisted in local state so `buildEventPayload` skips re-uploading on retry (explicit comment confirms this is intentional). No stale-success race or duplicate-upload issue found on retry specifically. (The orphan risk in §56/§EVT-001-§12-finding-2 is about *abandoning* the flow, not retrying it.)

## 61. Published Banner Consistency Matrix

| Surface | File | Field used | Fit mode | Box size |
|---|---|---|---|---|
| Create/Edit editor preview | `index.tsx:426,548-552` | local `bannerImage` state | `cover` | 100% × 160px |
| Event Feed Card | `EventFeedCard.tsx:170-173,823-831` | `event.bannerImageKey` only | `cover` (expo-image) | 100% × 250px |
| Event Detail | `event.tsx:373-374,1923-1924` | `bannerOriginalImageKey ?? bannerImageKey` (prefers **original**, unlike Feed) | `cover` | full width × 302px |
| Map marker/card | `MapContainer.tsx:28-29,141` | `event.bannerImageKey` (same as Feed) | marker-scale thumbnail | marker-scale |

**Findings that directly break "editor preview matches published banner":**
1. Four different aspect/box sizes render the same `cover`-fit image differently — since the picker's crop has no fixed `aspect`, whatever the user frames in the editor will very likely be re-cropped differently on Feed, Detail, and Map.
2. `bannerImageDisplay` (the crop-rectangle field, fully plumbed through frontend/store/backend) is **dead infrastructure** — never actually set by any UI code (the picker never captures a crop rect) and never read by any rendering surface.
3. Field-name/precedence mismatch: Feed/Map read `bannerImageKey`; Event Detail prefers `bannerOriginalImageKey`. If these ever diverge (e.g. one is a compressed/display copy), Feed/Map and Detail could legitimately show different pixels for the same event.
4. **Three different fallback strategies** for a missing banner: Feed shows a calendar icon over a solid box; Event Detail shows one stock Unsplash photo; Map shows a **different** stock Unsplash photo; none matches the editor's own empty-state (an upload prompt). An event with no banner looks inconsistent depending on where it's viewed.

## 62. Cache/Staleness Audit

Not independently investigated beyond field-mapping (per audit rules, this is source-level only, not visual/runtime cache-parity proof). No cache-key/versioning issue was found or ruled out from source; flagged as **cannot prove from source alone**.

## 63. EVT-005 Test Coverage

**None for the banner specifically.** The only backend media test (`api/test/event-media.test.ts`) covers the separate 30-item gallery feature, not `bannerImageKey`/`bannerOriginalImageKey`. No frontend test touches `pickImage`/`removeImage` in `index.tsx`.

## 64. EVT-005 Exact Gaps

1. **No real file-type/size validation, client or server.** Files: `app/app/create-event/index.tsx` (picker), `app/stores/eventDraftStore.ts:154-162` (`getImageContentType`), `api/src/modules/storage/storage.validation.ts`. Classify as **D** — a malformed/oversized/wrong-type upload is silently accepted and mislabeled, which could break downstream rendering or violate the stated "JPEG or PNG only" policy. Smallest fix: validate real MIME (not extension-guess) client-side before upload, and add a content-type/size check to the banner-specific save path server-side (or route banner uploads through the same validated path as gallery media).
2. **No upload-progress UI**, despite the capability existing unused. File: `app/stores/eventDraftStore.ts` banner upload calls. Smallest fix: pass an `onProgress` callback through to a progress indicator in `index.tsx`.
3. **Orphaned S3 objects on banner replace.** File: `app/stores/eventDraftStore.ts` (`setStepOne`, key-reset logic). Smallest fix: either a backend GC job, or an explicit delete-old-object call on replace.
4. **Inconsistent "banner required" enforcement** (Save Draft bypasses the schema that Next/Save & Exit enforce). File: `app/app/create-event/index.tsx` (`handleSaveDraft` vs `handleNext`/`handleSaveAndExit`). Low-severity UX inconsistency, not data loss (drafts are legitimately allowed to be incomplete) — but worth confirming the asymmetry is intentional.
5. **Cross-surface banner rendering inconsistency** (§61) — four different aspect ratios and three different fallback images across Create/Feed/Detail/Map, plus a dead crop-rect field. Files: `index.tsx`, `EventFeedCard.tsx`, `event-screen/event.tsx`, `MapContainer.tsx`. This is the direct, evidence-backed reason the "editor preview matches published banner" acceptance criterion currently fails.

---

## 65. EVT-006 Classification: **C** (existing implementation is materially correct on consistency, but conflicts with the stated 20-category acceptance criterion)

## 66. Category Source-of-Truth Inventory

Three canonical, byte-for-byte-identical files, mutually enforced by a dedicated test:
1. `app/constants/eventCategories.ts` (`EVENT_CATEGORY_METADATA`) — mobile app source of truth.
2. `admin/src/shared/eventCategories.ts` — admin dashboard's own copy, identical data.
3. `api/src/modules/events/event.interface.ts:52-218` (`eventCategoryMetadata`) — backend source of truth.

All frontend consumers (`app/lib/eventFilters.ts`, `eventCategoryNavigation.ts`, `events.ts`, `payments.ts`, `eventDraftStore.ts`, home/map/event-screen/discover/create-event screens) import from #1 with no independent lists. Backend validation (`event.validation.ts`, `event.model.ts`, `event.service.ts`) imports from #3 with no independent lists. `api/test/event-taxonomy.test.ts` deep-equals all three files and asserts `length === 18`, plus a legacy-name blocklist rejection test.

**Note flagged for verification:** the test's import path for the dashboard copy points to `../../xenog-dashboard/src/shared/eventCategories.ts`, but the actual admin app in this repo lives at `admin/`, not `xenog-dashboard/`. No `xenog-dashboard` directory was found. This either means the path is stale (possible renamed directory) or the test doesn't currently resolve/run as written — if so, the three-way cross-sync guarantee, while asserted in source, may not be actively verified in CI. This should be checked directly (not resolved in this audit) since it affects confidence in "the same taxonomy is enforced," even though the two copies that were directly read (`app/constants/eventCategories.ts` and `admin/src/shared/eventCategories.ts`) are in fact identical today.

## 67. Exact Apparent Final List (18, not 20)

1. Parties & Celebrations — 🎉
2. Nightlife & Clubs — 🍻
3. Social Meetups — 💬
4. College & Campus — 🎓
5. Live Music & Concerts — 🎸
6. Entertainment & Shows — 🎭
7. Arts & Culture — 🎨
8. Community & Movements — ✊
9. Food & Drinks — 🍹
10. Markets & Shopping — 🛍️
11. Sports & Outdoors — 🏃
12. Games & Recreation — 🎮
13. Workshops & Classes — 🧶
14. Conferences & Talks — 🎤
15. Family & Gathering — 🏡
16. Wellness & Spirituality — 🧘
17. Travel & Experiences — ✈️
18. Pop-Ups & Exclusives — ✨

(label doubles as slug/value in every case; source: `app/constants/eventCategories.ts:3-159`)

## 68. Count/Duplicates Audit

Exactly 18 in all three canonical files. No duplicate labels, no duplicate slugs (label === slug, test-enforced), no missing emojis. **No conflict between competing lists** — the only issue is the count vs. the requirement's "20."

## 69. Max-Three Enforcement

**Genuinely enforced server-side, not client-only.**
- Client: `step-2.tsx` `MAX_CATEGORIES = 3`, blocks the 4th selection in the toggle handler, plus a Zod cap on submit.
- Backend, three independent redundant layers: (1) Zod schema max/unique refine, (2) Mongoose schema-level validator function, (3) `assertPublishableCategories()` service-level throw. Test-confirmed: selecting 4 categories is rejected by both draft and publish schemas.

## 70. Create Event Taxonomy

Correct — imports directly from `app/constants/eventCategories.ts`, same list, same enforcement.

## 71. Edit Event Taxonomy

Correct by construction — **no separate Edit Event screen exists**; `step-2.tsx` is reused for both Create and Edit (same finding as EVT-004 §47), so there is no possibility of taxonomy drift between them.

## 72. Search Taxonomy

**No category picker exists in Search at all** — `app/app/discover-screen/search.tsx` has no category references; search is free-text only, ranked server-side (`event-search-ranking.ts` tokenizes existing categories but exposes no UI picker). This means the EVT-006 acceptance item "Search" has no taxonomy to be inconsistent — it's simply absent as a filter surface, which may or may not match product intent.

## 73. Filters Taxonomy

**No category control in the general Filter modal** (`app/components/home/FilterModal.tsx` — only age/price/time/date/hashtags/radius). Category filtering instead happens via a separate "Discover by category" screen (`app/app/discover-screen/event-category.tsx`, correctly sourced from the same 18-item constant) and via category-tag chips on feed cards that navigate there. Functionally present, just not inside the modal literally named "Filters" — worth confirming this satisfies the requirement's intent.

## 74. Profile Events Taxonomy

`ProfileEvents.tsx` has **zero category-specific logic** — it renders event cards via whatever card component it delegates to, which (per Create/Map findings) correctly sources categories elsewhere. No legacy or independent taxonomy found, but also no direct category filter control on this screen itself.

## 75. Map Taxonomy

Correct — `MapScreen.tsx` imports `EVENT_CATEGORIES` from the same canonical source for its category filter rail (plus a synthetic "All" option), same labels/emojis/slugs.

## 76. Backend Taxonomy

Correct and most strongly enforced surface — 18 categories, three redundant validation layers, explicit legacy-name rejection test.

## 77. Legacy Category Labels

**None found live/reachable in production code.** The only place legacy names exist textually is a fixture array inside `api/test/event-taxonomy.test.ts` (used to assert they are rejected) — not user-visible, not accepted by the backend. A broad grep for common category words (Music, Sports, Nightlife, Food, Art, Business, Technology, Education, Health) hit only test files and three unrelated admin components (payment/user-management screens using "category" in an unrelated sense) — not inspected in full depth but names strongly suggest no overlap with event categories.

## 78. Cross-Surface Category Matrix

| Surface | Count | Same labels/emojis/slugs? | Max-3 enforced? | Legacy entries? | Source file |
|---|---|---|---|---|---|
| Create Event | 18 | Yes | Yes (client + 3x server) | None | `app/constants/eventCategories.ts` |
| Edit Event | 18 | Yes (same component as Create) | Yes | None | same |
| Search | N/A — no category picker | N/A | N/A | N/A | — |
| Filters (modal) | N/A — no category control in this specific modal | N/A | N/A | N/A | category filtering lives in `discover-screen/event-category.tsx` instead |
| Discover-by-category | 18 | Yes | N/A (read-only) | None | `app/constants/eventCategories.ts` |
| Profile Events | N/A — no direct category logic | N/A | N/A | N/A | delegates to shared card components |
| Map | 18 (+ synthetic "All") | Yes | N/A (read-only filter) | None | `app/constants/eventCategories.ts` |
| Backend validation | 18 | Yes | Yes (3 layers) | Actively rejects legacy names (test-verified) | `event.interface.ts`, `event.validation.ts`, `event.model.ts`, `event.service.ts` |

## 79. EVT-006 Test Coverage

**Strong** — `api/test/event-taxonomy.test.ts` is a genuine runtime unit test (not source-regex) that imports and deep-equals the real constant arrays from all three surfaces and exercises the real Zod schemas for max-3/duplicate rejection. This is the single best-tested requirement in the whole audit. (Caveat: the dashboard import path noted in §66 should be verified to actually resolve.)

## 80. EVT-006 Exact Gaps

1. **Category count is 18, not the 20 required by the EVT-006 acceptance text.** This is a deliberate, test-locked product decision (`api/test/event-taxonomy.test.ts:80`, comment: "the finalized PDF category order"), not an accidental bug — flagged as a **source-of-truth/spec conflict requiring a product decision**, not something to silently "fix" by adding two categories. Files that would change if 20 is in fact correct: `app/constants/eventCategories.ts`, `admin/src/shared/eventCategories.ts`, `api/src/modules/events/event.interface.ts`, plus `event.model.ts` enum and the test's own hard-coded `length === 18` assertion.
2. **No migration/normalization path for legacy category values on historical events.** If the current 18-list is itself a later revision of an even-earlier taxonomy, any pre-existing events tagged under an older scheme would have no fallback beyond a generic gray-dot color default — the category **label text itself** would render raw/unrecognized, and such events would be silently unfilterable by category. Not confirmed as an active problem (no database inspection was in scope), but the absence of any fallback/migration code is a structural gap worth flagging.
3. **Search and the general Filters modal have no category control at all** — worth confirming this matches product intent, since the requirement lists both as taxonomy-consuming surfaces.

---

## 81–86. Cross-Requirement Findings

**81. Draft + Navigator (§BF):** Since EVT-002's navigator does not exist, this scenario reduces to plain linear forward/back navigation, which was proven data-preserving (single shared store). No cross-requirement issue found beyond EVT-002's own absence.

**82. Draft + Banner (§BG):** Confirmed safe — the draft-persisted banner value is always a remote storage key (never a raw local URI), so draft+banner restore across app restart is backed by the same restart-safety argument as the rest of the draft (§36), not undermined by an ephemeral URI.

**83. Draft + Categories (§BH):** Confirmed safe — categories are stored as plain string arrays from the single canonical source; no silent legacy mapping occurs on save or restore.

**84. Create/Edit Compatibility (§BI):** Confirmed strong — Create and Edit are literally the same component/store, so an event created today can be reopened for editing without losing banner, categories, location, tickets, privacy, or timezone, by construction (not by parallel-implementation luck).

**85. Published Surface Matrix (§BN):**

| Field | Editor | Preview (=Event Detail refetch) | API | DB | Feed | Detail | Map | Edit |
|---|---|---|---|---|---|---|---|---|
| Name | ✓ | ✓ (server fetch) | ✓ | ✓ | not verified in this pass | ✓ | not verified | ✓ (shared component) |
| Description | ✓ | ✓ | ✓ | ✓ | not verified | ✓ | n/a | ✓ |
| Banner | ✓ (160px box) | ✓ | ✓ | ✓ (2 key fields) | ✓ (250px, `bannerImageKey`) | ✓ (302px, prefers `bannerOriginalImageKey`) | ✓ (marker-scale, `bannerImageKey`) — **field/aspect mismatch, see EVT-005 §61** | ✓ (same as editor) |
| Categories | ✓ | ✓ | ✓ | ✓ | consistent (shared source) | consistent | consistent | ✓ |
| Start/end | ✓ | ✓ | ✓ | ✓ (absolute UTC) | consistent | consistent | consistent | ✓ |
| Timezone | resolved server-side | ✓ | ✓ | ✓ | n/a (uses absolute time) | ✓ | n/a | ✓ |
| Location | ✓ | ✓ | ✓ | ✓ | consistent | consistent | consistent (if coords present — see §8) | ✓ |
| Tickets | ✓ | ✓ | ✓ | ✓ | consistent | consistent | consistent (`event-card-consistency.test.ts` verifies map matches) | ✓ |
| Privacy | ✓ | ✓ | ✓ | ✓ | consistent | consistent | consistent | ✓ |

**The one confirmed mismatch in this matrix is the banner field/aspect/fallback inconsistency documented in EVT-005 §61.** All other fields show no evidence of cross-surface drift.

**86. Reliability Findings, Critical → Low:**
- **D (reliability-sensitive):** Banner file-type/size validation effectively absent (EVT-005 §53-54).
- **D (reliability-sensitive):** Orphaned S3 objects on banner replace / abandoned draft saves (EVT-001 §12, EVT-005 §56).
- **C (behaviorally incomplete):** Preview/Publish naming-mechanism split creates risk of hosts believing they've published (EVT-001 §11-12).
- **C (behaviorally incomplete):** Category count mismatch vs. stated requirement (EVT-006 §80).
- **C (unclear product intent):** Lat/lng not required to publish; possible un-mappable published events (EVT-001 §8).
- **E (UX-only):** Business-account gate is reactive/late (EVT-001 §5).
- **E (UX-only):** Banner-required validation inconsistently enforced between Save Draft and Next/Save&Exit (EVT-005 §57).
- **E (UX/copy-only):** Legacy Basics copy never updated (EVT-004, whole requirement).
- **F (missing feature):** Step navigator does not exist (EVT-002, whole requirement).
- **F (missing feature):** No upload-progress UI for banner despite library support (EVT-005 §59).

---

## 87. UX Findings

- Wizard's primary CTA reads "Preview" but performs a real backend draft-save write — misleading.
- No step navigator at all — users cannot see or jump to other steps; only a static "Step N of 5" label.
- Banner "required" validation is inconsistently enforced depending on which button is pressed.
- No banner upload progress feedback beyond a static "Saving…" label.
- Business-account requirement surfaces only after a user has completed the whole form.

## 88. Backend/API Consistency Findings

- Draft vs. publish schemas correctly tighten requiredness (name/categories/schedule/location/privacy/tickets) at publish time while allowing incomplete drafts — well-designed.
- Category enforcement is triple-redundant server-side (zod + mongoose + service assert) — unusually strong.
- Banner content-type validation is the one place server-side enforcement is missing entirely (goes through the generic, unvalidated storage endpoint rather than the event-media validated path).
- Location schema lacks a both-or-neither lat/lng refine that exists for query-param schemas elsewhere in the same file — an asymmetry worth a deliberate look.
- Two structurally different "publish" code paths exist (`eventDraftStore.publish()` for re-publishing edits vs. `event.tsx handlePublishDraft()` for first-time publish) — functionally each is internally correct, but the split is a maintainability/consistency risk.

## 89. Missing/Weak Tests

- No component-mount / runtime tests exist anywhere for React Native screens in this repo (deliberate convention, acknowledged in the tests' own comments) — most "app-side" tests are source-text regex checks, not behavioral proof.
- Draft delete + ownership: zero test coverage.
- Banner upload/replace/delete: zero test coverage (the only "media" test covers the unrelated gallery feature).
- Step navigator: no test possible since the feature doesn't exist.
- No HTTP/integration-level backend tests anywhere (zero `supertest` usage) — all backend coverage is service-layer unit tests against hand-mocked repositories, not a real database.
- Category max-3 enforcement: backend covered by a real runtime test; frontend picker cap has no dedicated test.
- Cross-surface published-event rendering: only the Map surface's field derivation is directly tested against feed/detail's logic; no single test asserts all three surfaces render identically for one event.

## 90. Unclear Product Decisions / Source-of-Truth Conflicts

1. **EVT-006 category count**: is 20 the correct target (requiring 2 new categories), or is 18 the actual current-approved count (requirement text stale)? The codebase's own test treats 18 as deliberately finalized.
2. **Dashboard cross-sync test import path** (`xenog-dashboard` vs. actual `admin/` directory) — needs direct verification that this test currently resolves/runs in CI.
3. Whether coordinates should be required to publish (currently only text location identity is required).
4. Whether ticket purchase-limit fields are an intentional omission or a missing feature.
5. Whether an event can legitimately publish with zero tickets (currently allowed).
6. Whether Search/Filters modal are expected to expose a category picker (currently they don't; category filtering lives in a separate "Discover by category" screen).

## 91. Exact Production Files That Would Require Changes IF Fixes Are Pursued

- `app/app/create-event/index.tsx` — EVT-004 copy strings; EVT-005 banner validation/progress/required-consistency.
- `app/stores/eventDraftStore.ts` — EVT-005 banner content-type detection, orphan-key handling, upload progress plumbing.
- `api/src/modules/storage/storage.validation.ts` — EVT-005 server-side content-type whitelist for banner uploads.
- `api/src/modules/events/event.validation.ts` — EVT-001 location lat/lng pairing refine (if product confirms).
- `app/components/home/EventFeedCard.tsx`, `app/app/event-screen/event.tsx`, `app/components/home/MapContainer.tsx` — EVT-005 unify banner field precedence, aspect ratio, and fallback image.
- New component under `app/components/create-event/` (or similar) + all 9 files in `app/app/create-event/*` — EVT-002 navigator (additive).
- `app/constants/eventCategories.ts`, `admin/src/shared/eventCategories.ts`, `api/src/modules/events/event.interface.ts`, `event.model.ts`, `api/test/event-taxonomy.test.ts` — EVT-006 category count, only if product confirms 20 is correct.
- `app/app/create-event/step-5.tsx`, `app/app/event-screen/event.tsx` — EVT-001 Preview/Publish naming and flow clarity.

## 92. Safest Implementation Order IF Gaps Are Found

1. EVT-004 copy fix (zero risk, three string literals, no logic change).
2. EVT-005 banner file-type/size validation (contained to picker + one server validator, no schema/model change).
3. EVT-005 cross-surface banner field/aspect unification (touches 4 display files, no backend change).
4. EVT-003 delete-draft test (test-only, zero production risk).
5. EVT-001 Preview/Publish clarity pass (UI copy + possibly a combined publish CTA — needs product sign-off on desired flow).
6. EVT-001 upfront business-account gate (small, isolated to wizard entry).
7. EVT-002 step navigator (net-new component, largest scope, should follow once the above stabilize since it will touch every step file).
8. EVT-006 category-count reconciliation (requires product decision first; touches three source-of-truth files plus a test that currently asserts 18 is correct — must not be done silently).

## 93. Final Classification Table

| Requirement | Classification | One-line reason |
|---|---|---|
| EVT-001 — Create Event end-to-end | **C** | Core plumbing (save/publish idempotency, error handling, server-confirmed navigation) is solid; Preview/Publish naming split and reactive business-account gate are real but non-crashing gaps; banner and location sub-issues add D-severity risk in specific areas |
| EVT-002 — Tappable step navigator | **F** | Does not exist; only a static, non-interactive "Step N of 5" label |
| EVT-003 — Save Draft across all steps | **B** | Correctly implemented end-to-end (backend-persisted, ownership-checked, no duplication); only gap is missing delete-draft test coverage |
| EVT-004 — Basics copy cleanup | **F** | None of the required copy changes were made; legacy strings still live in production |
| EVT-005 — Banner upload and preview | **D** | File-type/size validation effectively absent; cross-surface rendering (field, aspect, fallback) is inconsistent, directly violating the stated acceptance criterion |
| EVT-006 — Final category taxonomy | **C** | Cross-surface consistency and enforcement are excellent; the list is 18, not the required 20 — a spec/product conflict, not a code defect |

---

## 94. Note on Audit Provenance

This report was compiled from eight parallel, evidence-based source audits (architecture/legacy-flow mapping, field-level basics/time/location/tickets/privacy tracing, preview/publish/post-publish tracing, step-navigator tracing, draft-system tracing, copy/banner tracing, category-taxonomy tracing, and test-coverage inventory), each citing exact file paths and line numbers from direct reading of the active codebase. Claims marked "cannot prove from source alone" or "unclear/not found" were left unresolved rather than assumed, per audit instructions. No production code, tests, or configuration were modified in the course of this audit.
