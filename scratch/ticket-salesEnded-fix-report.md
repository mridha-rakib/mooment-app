# Fix Report — "Unrecognized key(s) in object: 'salesEnded'" on Save Draft

Scope: this single runtime bug only. EVT-002, EVT-004, and the narrow EVT-005 behaviors from the previous two batches were all re-verified unchanged. EVT-006 categories untouched. No backend file was changed.

---

## 1. Exact root cause

`app/stores/eventDraftStore.ts`'s ticket sanitizer (`stripLocalTicketField`) used an **exclusion list** instead of an allowlist: it destructured out only `localId` and `availableCount` before sending a ticket to the backend, and forgot `salesEnded` — a field that is documented in its own type definition as `// Response-only, server-derived` but was never actually excluded anywhere in the outbound write path.

## 2. Exact payload containing `salesEnded`

Any ticket-bearing write request built from a ticket that originated server-side: the `tickets` array inside the `Save Draft` (`POST/PATCH /events/drafts...`) body, the `Publish` (`POST /events/publish` / `POST /events/:id/publish`) body, and the per-ticket `POST/PATCH /events/:id/tickets` / `.../drafts/:id/tickets` bodies — e.g.

```json
{
  "id": "…",
  "name": "General",
  "description": "…",
  "salesEndAt": "2026-09-01T00:00:00.000Z",
  "type": "free",
  "price": 0,
  "capacity": 100,
  "salesEnded": false
}
```

matching exactly the screenshot's error, reproduced by opening any Event/draft whose backend response already contains at least one ticket and pressing Save Draft.

## 3. Where `salesEnded` originated

`app/lib/events.ts`'s `EventTicketPayload` (the **response** shape returned by every Event-fetching endpoint) includes `salesEnded?: boolean` — a field the backend derives and returns (`Boolean(salesEndAt && salesEndAt <= serverNow)`, per the existing comment). `eventDraftStore.ts`'s `mergeTicketsFromEvent` (called from `loadFromEvent()` on reopening a draft/published Event, and from `getEventSyncState()` after every successful save) does `{...ticket, localId: ...}` — a full spread of the server ticket into the draft's ticket state, `salesEnded` included.

## 4. Why it was not stripped

The write-model type `EventTicketRequestPayload` was declared as `Omit<EventTicketPayload, "availableCount">` — it named only `availableCount`, not `salesEnded`, so the TS type itself silently allowed `salesEnded` to remain in the "write" shape. The runtime function that was supposed to enforce this (`stripLocalTicketField`) mirrored that same oversight: it destructured out `localId` and `availableCount` only, leaving `salesEnded` in the `...ticket` rest-spread that became the request payload. Since a *newly created* ticket never carries `salesEnded` at all (it only exists on tickets that came from a server response), the bug was invisible for a brand-new event and only manifested once a ticket had round-tripped through the backend at least once — exactly what the screenshot shows (editing/saving an event whose ticket was already server-loaded).

## 5. Whether `salesEnded` is response-only

**Yes**, confirmed from three independent sources: (a) its own doc comment in `app/lib/events.ts` ("Response-only, server-derived"), (b) the backend's `EventTicket` response interface documents it as computed (not present in `EventTicketInput`), and (c) the backend's write-contract Zod schemas (`eventTicketShape`/`eventTicket`/`updateEventTicket` in `api/src/modules/events/event.validation.ts`, all `.strict()`) do not define a `salesEnded` field at all — any request containing it is rejected outright, which is the exact observed error.

## 6. Whether `availableCount` is response-only

**Yes**, and this was already correctly handled before this fix — `availableCount` is server-owned inventory (`api/src/modules/events/event.service.ts` computes it from `capacity` deltas on publish/re-publish, never accepts it from the client) and was already excluded from `EventTicketRequestPayload` and from the old `stripLocalTicketField`'s destructuring. This fix preserves that exclusion (now via the same allowlist mechanism, rather than a second ad-hoc exclusion) and adds a regression test for it (§ tests 5/13 below), since the previous exclusion-list approach had already proven itself fragile once.

## 7. Exact write-model fields

Confirmed against the backend's `.strict()` Zod schemas (unread and unchanged by this fix): `id?` (create-only, dropped for updates via the existing `stripTicketIdentity`), `name`, `description?`, `salesEndAt?`, `type`, `price`, `capacity`. Nothing else is legal in any of Save Draft, Publish, Update Event, Create/Update Draft Ticket, or Create/Update Published Ticket — all six write paths share this exact same shape (the create/publish paths take a full ticket; the two update-ticket endpoints take a partial of it).

## 8. Exact production files changed

- `app/lib/eventTicketPayload.ts` — **new**. `toEventTicketInput(ticket): EventTicketRequestPayload`, a pure, explicit allowlist sanitizer (zero runtime dependencies — only a type-only import from `app/lib/events.ts`, so it is directly unit-testable, same pattern as `app/lib/eventBannerValidation.ts` from the EVT-005 batch).
- `app/lib/events.ts` — `EventTicketRequestPayload` now excludes `salesEnded` as well as `availableCount` at the type level (`Omit<EventTicketPayload, "availableCount" | "salesEnded">`), so a future attempt to spread a raw response ticket into a write-shaped variable is now a type error, not just a silently-wrong runtime object.
- `app/stores/eventDraftStore.ts` — the old exclusion-list `stripLocalTicketField`/`stripLocalTicketFields` functions were removed and every call site (`buildEventPayload`'s outbound tickets, `publish()`'s outbound tickets, the draft-vs-published baseline comparison used to skip no-op saves, and both branches of `saveTicket`'s per-ticket create/update) now goes through `toEventTicketInput`/`toEventTicketInputs`. No other logic in this file was touched — `draftSaveQueue`, `draftId` handling, POST-vs-PATCH branching, and every non-ticket field are untouched.

Nothing in `CreateEventStepNavigator.tsx`, `eventWizardSteps.ts`, the EVT-004 copy strings, or `eventBanner.ts`/`eventBannerValidation.ts` was touched.

## 9. Whether backend validation changed

**No.** No backend file was opened for editing. The fix is entirely on the frontend outbound-serialization boundary, as the task anticipated.

## 10. Why backend strict validation remains safe

It was never the problem — a `.strict()` Zod schema correctly rejecting an unrecognized key is exactly the safety net working as designed; it caught a real client bug. Weakening it (adding `salesEnded: z.boolean().optional()`, or switching to `.passthrough()`) would have let the client claim authority over a server-computed value, which is the opposite of what's needed — see §13.

## 11. Exact serializer/sanitizer behavior

`toEventTicketInput` copies exactly seven fields by name — `id` (only if present, via a conditional spread, so a ticket with no id yet never sends `id: undefined` as an own key), `name`, `description`, `salesEndAt`, `type`, `price`, `capacity` — and nothing else, regardless of what other properties the input object happens to carry. Because it's additive (name each field you want) rather than subtractive (name each field you don't want), a hypothetical future response-only field (e.g. if the backend later adds a second computed ticket flag) would be excluded automatically, with no code change required here — which is the whole point of the allowlist direction the task asked for.

## 12. Proof existing ticket data is preserved

`app/test/eventTicketPayload.test.ts`: "existing ticket id is preserved exactly" and the main payload-assertion test both confirm `name`/`description`/`salesEndAt`/`type`/`price`/`capacity`/`id` all pass through unchanged — only `salesEnded` and `availableCount` are dropped. `app/test/eventTicketPayloadWiring.test.ts` confirms all four call sites in the store (draft save, publish, baseline comparison, per-ticket save) still route every ticket through this same sanitizer, so no ticket write path lost any writable field.

## 13. Proof server-owned fields cannot be overwritten

Two independent layers, both test-verified: (a) the frontend sanitizer never includes `availableCount` or `salesEnded` in any outbound payload regardless of what values a response ticket carries (`toEventTicketInput` test: a ticket with `salesEnded: true`/`availableCount: 0` still produces an output with neither key present), and (b) even if a client bypassed the app entirely and POSTed those fields directly, the backend's untouched `.strict()` schemas would reject the request — the same protection that surfaced this bug in the first place remains fully intact.

## 14. Fresh Event Save Draft result

Unaffected by the bug in the first place (a brand-new ticket never carries `salesEnded`), and unaffected by the fix — `app/test/eventTicketPayload.test.ts`'s "fresh, never-server-loaded ticket" test confirms a ticket with no `salesEnded`/`availableCount` at all still serializes correctly with every writable field intact.

## 15. Reopened Draft Save Draft result

This was the exact failure path. Fixed: a reopened draft's tickets (loaded via `loadFromEvent` → `mergeTicketsFromEvent`, which still spreads the full response including `salesEnded`) are now sanitized through `toEventTicketInput` before ever reaching `buildEventPayload`'s outbound `tickets` array, so `salesEnded` can no longer appear in the Save Draft request body. Verified by the wiring test confirming `buildEventPayload`'s `tickets:` line uses the sanitizer.

## 16. Edit Published Event save result

Same fix applies — `updateEvent`'s (published-event) Save/Save & Exit path also builds its payload through `buildEventPayload`, which now sanitizes tickets identically. The per-ticket published-event update branch inside `saveTicket` (`isEditingPublishedEvent` branch) was independently verified to also call the sanitizer.

## 17. Publish result

`publish()`'s outbound `tickets:` line was updated identically to `buildEventPayload`'s — verified by a dedicated wiring test slicing the `publish` function body and asserting it uses `toEventTicketInputs(state.tickets)`.

## 18. Focused tests

- `app/test/eventTicketPayload.test.ts` — **6 runtime tests** of `toEventTicketInput` itself: the exact payload-shape assertion from the task (input with `availableCount`/`salesEnded` → output without either), `salesEnded: true` also stripped (not just `false`), a fresh ticket round-trips cleanly, no-id ticket never sends `id: undefined` as an own key, existing id preserved, `null` description/salesEndAt preserved as `null` (not dropped).
- `app/test/eventTicketPayloadWiring.test.ts` — **8 source-wiring tests**: the store imports the new sanitizer, the old exclusion-list stripper is gone, all four store call sites (draft save, publish, baseline comparison ×2, per-ticket save ×2 branches) use it, the write-model type excludes both server-owned fields, and the response type still documents `salesEnded` as response-only.

## 19. EVT-002 regression results

`app/test/eventWizardSteps.test.ts` (16) + `app/test/eventStepNavigatorWiring.test.ts` (32): **48/48 pass**, unchanged — this fix touched only ticket serialization inside `eventDraftStore.ts`, never `CreateEventStepNavigator.tsx` or `eventWizardSteps.ts`.

## 20. EVT-004 regression results

`app/test/eventBasicsCopyAndBannerRequired.test.ts`: **10/10 pass**, unchanged — the copy strings live entirely in `index.tsx` and were not touched.

## 21. EVT-005 regression results

`app/test/eventBanner.test.ts`: **11/11 pass**, unchanged — banner validation/consistency logic lives in `eventBanner.ts`/`eventBannerValidation.ts`, neither of which was touched. The banner-required-for-Save-Draft assertions (part of the EVT-004 file above) also still pass, confirming this fix didn't disturb the banner-required gate that sits right next to the code this fix changed.

## 22. TypeScript result

`tsc --noEmit -p tsconfig.json`: **5 pre-existing errors, all unrelated** and identical in file/line to both previous batches (`lib/momentPostMapper.ts` ×2, `test/smartFeedRankingLocation.test.ts` ×2, `test/mapPreviewSlideLayoutStability.test.ts` ×1). **Zero errors in any file this fix touched** (`eventDraftStore.ts`, `eventTicketPayload.ts`, `events.ts`, `create-event/*`), confirmed by grepping the full output for those filenames.

Lint: attempted via `npx eslint` on every touched file; blocked by the same pre-existing, unrelated cause as both previous batches (`'...\eslint.exe' was blocked by your organization's Device Guard policy`) — an OS/organization-level restriction on this machine, not worked around.

## 23. Unrelated pre-existing failures

Full frontend suite (`bun test`, 152 files): **1919 pass / 11 fail / 1 error** — pass count rose by exactly 14 (the 6 + 8 new tests) relative to the EVT-002 batch's 1905, and a name-by-name diff shows the **exact same** 10 failing tests + 1 error as both previous batches, byte-for-byte identical apart from timing. Backend: `event-draft-preview.test.ts` (30), `event-ticket-management.test.ts` (24), and `event-banner-required.test.ts` (8) — **62/62 pass**, all still green (no backend file was touched). `event-taxonomy.test.ts` still fails with the same pre-existing, untouched stale-import error (`Cannot find module '../../xenog-dashboard/src/shared/eventCategories.ts'`) documented in both previous reports.

## 24. Final status

**Fixed.** `salesEnded` (and, defensively, `availableCount`) can no longer appear in any Event/ticket write payload — Save Draft, Publish, Update Event, or either per-ticket endpoint — regardless of whether the ticket originated fresh or was loaded from a server response. The fix is an explicit allowlist at the frontend serialization boundary, not a backend schema relaxation; the backend's `.strict()` ticket schemas are untouched and remain the enforcing authority. EVT-002, EVT-004, and EVT-005 are all confirmed intact by their existing focused test suites, and EVT-006 categories were not touched.
