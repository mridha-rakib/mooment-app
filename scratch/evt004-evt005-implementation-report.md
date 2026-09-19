# EVT-004 + Narrow EVT-005 Implementation Report

Scope: Basics copy cleanup (EVT-004) and banner required/validated/consistent (EVT-005, narrow). EVT-002 (step navigator) and EVT-006 (categories) were explicitly out of scope and were not touched.

---

## 1. Exact production files changed

**Frontend**
- `app/app/create-event/index.tsx` — copy strings, banner-required Save Draft gate, picker validation (MIME/size), editor preview rendering, `bannerContentType` local state.
- `app/stores/eventDraftStore.ts` — new `bannerContentType` field, crop/display-metadata preservation fix, real-MIME-first content-type resolution for upload.
- `app/lib/eventBanner.ts` — rewritten as a thin RN-dependent layer (`resolveEventBannerUri`) that re-exports the pure module below.
- `app/lib/eventBannerValidation.ts` — **new**. Pure, dependency-free banner logic: MIME/size validation, key precedence, crop-focal derivation, shared fallback constant.
- `app/components/home/EventFeedCard.tsx` — banner key precedence + `contentPosition`.
- `app/components/home/MapContainer.tsx` — banner key precedence + shared fallback image.
- `app/app/event-screen/event.tsx` — banner key precedence fix (was preferring the wrong key), `contentPosition`, shared fallback constant, ShareModal image source unified.

**Backend**
- `api/src/modules/events/event.service.ts` — `getEffectiveBannerImageKey` + `assertPublishableBanner` helpers, wired into `saveDraft`, `publish`, and `updateEvent`.
- `api/src/modules/storage/storage.validation.ts` — JPEG/PNG-only content-type check, scoped to the `events/banners/` key prefix only.

**Nothing else in production code was touched.** No step-navigator file, no category/taxonomy file, no ticket/privacy/location/timezone logic, no Feed/Detail/Map layout/geometry, no test-taxonomy file.

## 2. Exact tests added/updated

**Added**
- `api/test/event-banner-required.test.ts` — 8 runtime tests (mocked-repository `EventService`, matching the existing convention) covering new-draft/publish rejection, update/publish preservation-when-omitted, and explicit-clear rejection on drafts and published events.
- `app/test/eventBanner.test.ts` — 11 runtime tests of the pure helpers in `eventBannerValidation.ts` (MIME normalization/allow-list, size cap, key precedence, fallback, crop-focal derivation).
- `app/test/eventBasicsCopyAndBannerRequired.test.ts` — 10 source-text tests (matching this repo's established convention for screens that can't be mounted under `bun test`) verifying the active copy and the Save Draft banner-required wiring.

**Updated (fixture-only — no assertion was weakened; each existing draft/event fixture now includes a banner, since one is now a mandatory field, exactly analogous to how these fixtures already provide `name`/`scheduledAt`)**
- `api/test/event-draft-preview.test.ts` — default fixture banner + one new-draft payload.
- `api/test/event-create-timezone.test.ts` — default fixture banner in `baseEventDoc`/`draftDto` + one raw publish payload.
- `api/test/event-hashtags.test.ts` — default fixture banner in `makeExistingEvent` + two new-draft payloads.
- `api/test/event-ticket-management.test.ts` — default fixture banner.

**`api/test/event-taxonomy.test.ts` was not modified.** It is pre-existing-broken in this environment (see §36) and unrelated to this work.

## 3. Pre-change banner architecture audit

Confirmed by direct source reading before any edit:

`Create Event Basics (index.tsx)` picker → local `bannerImage`/`bannerOriginalImage` state → `eventDraftStore.setStepOne` → `bannerImageUri`/`bannerOriginalImageUri` (+ `bannerImageKey`/`bannerOriginalImageKey` reset to `null` on change) → `saveDraft()`/`publish()` → `buildEventPayload()` uploads via `uploadFileToStorage` (guessing content-type from the URI's file extension) → backend `saveDraft`/`publish`/`updateEvent` (all treated `bannerImageKey` as an always-optional string) → `EventModel.bannerImageKey`/`bannerOriginalImageKey`/`bannerImageDisplay` → on reopen, `loadFromEvent()` rehydrates the store from the persisted `EventResponse` → rendering surfaces each independently resolved a URI: Feed and Map read `bannerImageKey` only; Event Detail read `bannerOriginalImageKey ?? bannerImageKey` (opposite precedence); each surface had its own fallback image (Feed: icon, Detail: one stock photo, Map: a different stock photo).

`bannerImageDisplay` (a normalized 0-1 crop rect) existed end-to-end in the type system, model, and Zod validation, but no UI ever wrote a value into it — dead infrastructure, confirmed by grep showing zero call sites setting it.

## 4. Authoritative banner field/source rule after the fix

**Single rule, one place** (`app/lib/eventBannerValidation.ts` `getEventBannerKey`): `event.bannerImageKey ?? event.bannerOriginalImageKey`. `bannerImageKey` (the display/edited asset the user actually selected/cropped) is now primary everywhere; `bannerOriginalImageKey` is fallback-only. Every rendering surface (Create/Edit editor preview, Feed, Event Detail, Map, the Event Detail ShareModal preview) now resolves through this same function (directly, or via `resolveEventBannerUri`, which wraps it with `getStorageFileUrl` + fallback handling). No component computes its own independent banner URL anymore.

## 5. EVT-004 exact copy changes

| Field | Before | After |
|---|---|---|
| Name placeholder | `"Name"` | `"Event name"` |
| Description placeholder | `"Event main highlights"` | `"Tell people what to expect"` |
| Banner helper | `"You can only upload one image for the banner"` + separate `"JPEG, or PNG"` hint | single `"Upload one event banner image - JPEG or PNG."` |

Validation (required/max-length) for name, description, and banner was **not** touched.

## 6. Proof "Event main highlights" is gone from active Event Basics

`app/test/eventBasicsCopyAndBannerRequired.test.ts` — `assert.doesNotMatch(basicsSource, /Event main highlights/)` against the live `app/app/create-event/index.tsx` source. Passes. (The string never appeared anywhere else in the repo outside this one file, per the earlier audit.)

## 7. Proof "JPEG, or PNG" is gone from active Event Basics

Same test file — `assert.doesNotMatch(basicsSource, /JPEG, or PNG/)`. Passes. The one other occurrence, in `app/components/profile/AddProductModal.tsx` (an unrelated Product-image-upload modal), was deliberately left untouched — out of scope per the task's own instruction.

## 8. Exact banner-required frontend rule

In `index.tsx`'s `handleSaveDraft`: if local `bannerImage` state is falsy, the handler sets the existing `errors.bannerImageUri` field-error state (same error text/pattern the schema already uses: `"Banner image is required"`) and returns immediately — **no upload, no `persistStepOne()`, no `saveDraft()` API call**. If a banner is present, it clears that error and proceeds exactly as before. `handleNext` and `handleSaveAndExit` already ran the full `createEventStepOneSchema` (name + description + banner all required) and were left unchanged. Presence alone satisfies the rule — an untouched, already-valid banner from a reopened draft is `bannerImage !== null` and passes without re-selection.

## 9. Exact banner-required backend rule

New private helpers on `EventService`:
- `getEffectiveBannerImageKey(existingEvent, normalizedPayload)` — returns `normalizedPayload.bannerImageKey` if the request body actually included that field (checked via `!== undefined`, which correctly distinguishes "omitted" from "explicitly cleared"); otherwise falls back to `existingEvent.bannerImageKey`.
- `assertPublishableBanner(key)` — throws `AppError("Add a banner image before saving this event.", 400)` if the effective key is falsy.

Wired into:
- `saveDraft` (both the new-draft and update-draft branches, using `existingDraft` — `null` for a new draft).
- `publish` (both the new-publish and existing-draft/existing-published branches, using `existingEvent`).
- `updateEvent` (editing an already-published event), alongside the existing `assertPublishableCategories` call.

## 10. Legacy draft handling

No migration was written (explicitly out of scope). A pre-existing banner-less draft can still be **loaded and edited** (no read-path check was added). It can only be **re-saved or published** once a banner is present — the same `assertPublishableBanner` check applies uniformly to old and new drafts alike, since it evaluates the record's *current* effective key at save time, not its creation-time state.

## 11. Existing-banner PATCH behavior

Confirmed by both the new backend test and the existing-fixture regression fixes: a `PATCH`/update request that omits `bannerImageKey` entirely leaves the persisted value untouched (`normalizedPayload.bannerImageKey` stays `undefined`, and the repository's partial update never touches that field), while `assertPublishableBanner` still passes because it falls back to `existingEvent.bannerImageKey`. Only an update that **explicitly** sends `bannerImageKey: null` (or an empty string, which `normalizeDraftPayload` also coerces to `null`) with no existing banner to fall back on is rejected.

## 12. JPEG/PNG validation logic

**Client** (`index.tsx pickImage` → `getEventBannerRejectionReason`): if the picker asset reports a `mimeType` and it doesn't normalize to `image/jpeg` or `image/png` (`isAllowedEventBannerMimeType`, in `eventBannerValidation.ts`), the selection is rejected with an alert before any state changes. `image/jpg` is normalized to `image/jpeg`.

**Server** (`storage.validation.ts`): the presigned-upload-URL request (`POST /storage/upload-url`) now runs a `superRefine` that, only when `key` starts with `events/banners/`, rejects any `contentType` that doesn't normalize to `image/jpeg`/`image/png`. Every other upload type (moments, stories, chat, products, the event gallery) is unaffected — confirmed by `storage-media.test.ts` (8/8 pass, unchanged) and by the key-prefix scoping itself.

## 13. Exact max banner size in bytes

`EVENT_BANNER_MAX_BYTES = 15 * 1024 * 1024` (binary bytes; equals 15,728,640) — defined once in `app/lib/eventBannerValidation.ts` and used by the picker rejection check. This matches the repository's own existing convention for the event gallery's image cap (`EVENT_MEDIA_IMAGE_MAX_BYTES` in `app/lib/events.ts`, also `15 * 1024 * 1024`), so no stricter pre-existing banner-specific policy was found or overridden.

## 14. MIME trust boundary — stated explicitly

**Client**: uses the picker's own reported `asset.mimeType`; if that's absent, falls back to a file-system size read (`expo-file-system` `getInfoAsync`) for size only and **skips** the type check rather than guessing — no byte-signature sniffing was added (no new dependency).

**Server (new banner-specific check)**: validates the `contentType` string the client declares when requesting the presigned upload URL — it does not download or inspect the uploaded bytes.

**Server (fallback path)**: `uploadFileToStorage`'s local-dev/MinIO fallback route (`PUT /storage/upload`) uses a separate, pre-existing query schema (`storageKeyQuery`) that is shared with the read/streaming routes and was **not** given the same content-type restriction, to avoid risking legacy-content streaming — per `shouldUseApiUploadProxy`'s own comment, that fallback route is only reachable from `localhost`/`127.0.0.1`/the Android emulator's `10.0.2.2`, i.e. local development, not production traffic. **This is the one deliberate, documented gap**: a locally-run dev client could still upload a non-JPEG/PNG banner through that fallback path. Closing it would require either a second, write-only query schema or splitting the shared route, which was judged out of the narrow scope for this batch.

**Net**: metadata-based trust boundary throughout, exactly as scoped — no binary content sniffing anywhere.

## 15. Picker-cancel behavior

Unchanged and re-verified: `if (result.canceled) { return; }` is the very first branch in `pickImage`, before any state read/write — a normal cancel leaves `bannerImage`/`bannerOriginalImage`/`bannerContentType` exactly as they were, with no alert.

## 16. Invalid-replacement preservation behavior

`getEventBannerRejectionReason` runs **before** any of `setBannerImage`/`setBannerOriginalImage`/`setBannerContentType`/`clearFieldError` — confirmed both by direct reading and by the new source-text test (`EVT-005: an invalid replacement is rejected before any banner state changes`, asserting the rejection check textually precedes the first state-mutating call). On rejection: an `Alert` is shown and the function returns; the previously valid banner (and its `bannerImageDisplay`, since that field is untouched by `pickImage`), plus every other Basics/step field, are all left exactly as they were.

## 17. Editor banner rendering rule

`index.tsx`'s preview `<Image>` (now `expo-image`, was `react-native`'s `Image`) renders the exact local picker/cropped URI (`bannerImage`) with `contentFit="cover"` and `contentPosition={getEventBannerContentPosition(bannerImageDisplay)}` — i.e. it already shows the user's actual selection/OS-crop result, and additionally now honors `bannerImageDisplay` if a future crop UI ever populates it (currently always `undefined` → expo-image's default center).

## 18. Draft-preview rendering rule

`app/app/event-screen/event.tsx`'s hero `<Image>` now resolves via `getBannerImageUri` → `resolveStorageUrl(getEventBannerKey(event), DEFAULT_BANNER)` — same precedence as every other surface (previously it alone preferred the original over the display key) — with `contentPosition` applied from `event.bannerImageDisplay`.

## 19. Feed rendering rule

`EventFeedCard.tsx`'s `bannerUri` now resolves via `resolveEventBannerUri(event, null)` (same key precedence, `null` fallback preserves Feed's existing icon-only empty state rather than forcing a stock photo), with `contentPosition` applied from `event.bannerImageDisplay`.

## 20. Event Detail rendering rule

Covered in §18 above; additionally the ShareModal's preview `imageUrl` (previously `bannerImageKey`-only) now goes through the same `getEventBannerKey` resolution.

## 21. Map rendering rule

`MapContainer.tsx`'s marker `image` field now resolves via `resolveEventBannerUri(event, FALLBACK_EVENT_IMAGE)` (same key precedence as every other surface; previously `bannerImageKey`-only, silently skipping a legacy event whose only key was `bannerOriginalImageKey`). `contentPosition`/focal-crop was **not** added to the map marker — its container is a small marker-scale thumbnail, not a full banner box, and expo-image isn't used there (plain RN `Image`), so applying crop-focal positioning would require a component change beyond this batch's geometry-preservation constraint; this is noted rather than silently attempted.

## 22. bannerImageDisplay/crop handling

- **Draft store** (`eventDraftStore.ts` `setStepOne`): now only resets `bannerImageDisplay` to `null` when the banner URI itself changes (a new pick invalidates any prior crop rect) or the caller explicitly supplies a new value; a save/navigation that leaves the banner untouched — including on a reopened draft — no longer silently wipes it. This was a real, if previously inconsequential (since the field was always `null` anyway), correctness fix directly required by "draft reopen preserves bannerImageDisplay."
- **Rendering**: `getEventBannerContentPosition(display)` (pure, in `eventBannerValidation.ts`) converts the normalized crop rect's center into an `expo-image` `contentPosition`, applied identically in the editor preview, Event Detail, and Feed. It resolves to `undefined` (default center) whenever no crop metadata exists — the case for every event today, since no UI writes this field yet; this was scoped as "don't ignore it if present," not "build a cropper."

## 23. Fallback policy

One shared constant, `EVENT_BANNER_FALLBACK_URI` (the same photo Event Detail already used), now used by both Event Detail and Map (`MapContainer`'s `FALLBACK_EVENT_IMAGE` is now just an alias for it) — no new image was introduced. Feed's fallback remains its own icon-over-solid-box empty state, which is a deliberately different **container treatment** for a missing banner, not different **imagery** implying a different event — consistent with the instruction that layout-specific fallback containers may keep their own geometry as long as they don't imply different event imagery (Feed shows no photo at all, rather than a mismatched stock one).

## 24. Proof card/layout geometry was not redesigned

No style/dimension/border-radius/spacing value was changed in any of the four rendering files. Diffed by hand: `EventFeedCard.tsx`'s `imageContainer` (250px), `event.tsx`'s `imageContainer`/`heroImage` (302px hero), `MapContainer.tsx`'s marker sizing, and `index.tsx`'s `imagePreviewContainer` (160px) are all byte-identical to before. The only render-prop additions are `contentPosition` (new prop, no geometry effect) and, in `index.tsx`, switching the `Image` import from `react-native` to `expo-image` with an explicit `contentFit="cover"` prop replacing the removed `resizeMode: 'cover'` style key — functionally identical rendering, same box.

## 25. Draft reopen behavior

`loadFromEvent()` was already correctly restoring `bannerImageUri`/`bannerImageKey`/`bannerOriginalImageUri`/`bannerOriginalImageKey`/`bannerImageDisplay` from the fetched `EventResponse` — unchanged. The bug this batch fixed was downstream: `index.tsx`'s own `persistStepOne()` (called on every Save Draft/Next/Save & Exit) previously caused the *store* to null out `bannerImageDisplay` on every one of those calls regardless of whether the banner changed, because it never re-passed the loaded value through `setStepOne`. Fixed in `eventDraftStore.ts` (§22) rather than by threading the field through every call site, since the store already has both the old and new URI values available to compare.

## 26. Edit Event unchanged-banner behavior

Create and Edit Event are the same screen/component (confirmed, unchanged architecture). Editing another field (e.g. description) while leaving the banner untouched: `bannerImage` local state is unchanged, so `handleSaveDraft`'s presence check passes trivially, and the persisted `bannerImageKey` is carried through unchanged by the backend's omit-preserves-existing logic (§11) whenever the value genuinely didn't change client-side (the store's `bannerImageKey`/`bannerOriginalImageKey` are only nulled when the *URI* changes — see `setStepOne`). Removing the banner on an existing published/draft event correctly blocks the next save (§8/§9) until a replacement is chosen.

## 27. Retry/upload-key reuse behavior

Untouched. `buildEventPayload`'s existing comment/logic ("Persist newly-uploaded S3 keys immediately so that if the API call fails and the user retries, buildEventPayload sees the keys and skips re-upload") and the `bannerImageKey`/`bannerOriginalImageKey` short-circuit checks in `uploadBanner()`/`uploadOriginalBanner()` were not modified — only the *content-type* used for a genuinely new upload changed (now prefers the picker's real MIME type over the filename-extension guess), which has no effect on the retry-skip logic.

## 28. Proof exact upload percentage was NOT added

Grep of every changed file for a percentage/progress-bar pattern: none. `uploadFileToStorage`'s existing `onProgress` callback capability was **not** wired up anywhere in this batch. The only user-visible upload-state feedback remains the pre-existing generic `"Saving…"` button-label swap.

## 29. Proof orphan-storage cleanup was NOT added

No new file, scheduled job, S3 delete-on-replace call, or lifecycle policy was introduced anywhere in this batch. The previously-identified orphan-object risk (an old banner's S3 object isn't deleted when replaced) is unchanged and was left exactly as it was.

## 30. Proof EVT-002 was untouched

No file under `app/app/create-event/{_layout,step-2,step-3,step-4,step-5,location-picker,ticket-details,ticket-preview}.tsx` was opened for editing in this batch (only `index.tsx` was touched, and only for Basics copy/banner). No new stepper/progress-navigator component was created. Confirmed by the file list in §1, which contains none of those paths.

## 31. Proof EVT-006/categories were untouched

`app/constants/eventCategories.ts`, `admin/src/shared/eventCategories.ts`, `api/src/modules/events/event.interface.ts`'s category metadata, `event.model.ts`'s category enum, and `api/test/event-taxonomy.test.ts` were not opened for editing at any point in this batch. The category-count/max-3 logic in `event.validation.ts`/`event.service.ts` (`assertPublishableCategories`, `eventCategoryList`) was read only to place the new banner check *alongside* it, never modified.

## 32. Relevant frontend test results

- `test/eventBanner.test.ts` (new): **11/11 pass**.
- `test/eventBasicsCopyAndBannerRequired.test.ts` (new): **10/10 pass**.
- `test/eventWizardSessionMode.test.ts`, `eventCreateTimezoneWiring.test.ts`, `eventStepTwoOngoingEdit.test.ts`, `eventStepThreeLocation.test.ts`, `draftPreviewPrivacySelector.test.ts`, `eventDataConsistency.test.ts`, `mapEventCarousel.test.ts`, `editFeatureWiring.test.ts`: **all pass** (88/89 in the first batch — the 1 fail is `eventCardOverlayContainment.test.ts`'s "badge status" test, confirmed pre-existing/unrelated below; 27/27 for `editFeatureWiring.test.ts` separately).
- Full frontend suite (`bun test`, 148 files after the additions): **1857 pass / 11 fail / 1 error**, run twice — the exact same 11 named failures + 1 error both times, byte-identical to the pre-existing baseline captured before any test file was added, confirming zero regressions from this batch. Every one of the 11 was traced to source text belonging to a *different* component than anything touched here (`RepostFeedCard`, attendee-list privacy, video-playback effects, map-marker-glow config, `getEventBadgeStatus`'s stale `nowMs` signature) — none reference banners, drafts, or Basics copy.

## 33. Relevant backend test results

- `api/test/event-banner-required.test.ts` (new): **8/8 pass**.
- `api/test/event-draft-preview.test.ts`: **30/30 pass**.
- `api/test/event-create-timezone.test.ts`: **11/11 pass**.
- `api/test/event-hashtags.test.ts`: **20/20 pass**.
- `api/test/event-ticket-management.test.ts`: **24/24 pass**.
- `api/test/event-media.test.ts`: **12/13 pass** — the 1 failure (`partial batch persists valid media and rejects invalid items independently`) is unrelated to banners (asserts a gallery-media batch count, 1 vs 2 — zero occurrences of the banner error message in its output) and pre-existing.
- `api/test/event-card-consistency.test.ts`: not independently re-run in isolation this pass, but showed no banner-related failures in the full-suite run.
- `api/test/event-taxonomy.test.ts`: **fails with a pre-existing module-resolution error** (`Cannot find module '../../xenog-dashboard/src/shared/eventCategories.ts'`) — confirmed unrelated to and untouched by this batch (see §36).
- Full backend suite (`bun test`, 120 files after the additions): went from **1145 pass / 299 fail / 8 errors** (before any fix) → **1166 pass / 278 fail / 8 errors** (after fixing the exact 21 tests that failed with the new "Add a banner image" error, across the 4 files above) → **1173 pass / 279 fail / 8 errors** (after adding the new 8-test file; +7/-1 relative to the prior run, and a direct diff against the run before that showed the full failing-test-name set is dominated by run-to-run non-determinism unrelated to banners — see §36). **Zero occurrences of "Add a banner image" remain anywhere in the final full-suite log.**

## 34. TypeScript results

- Backend: `npm run typecheck` (`tsc --noEmit`) — **clean, zero errors**.
- Frontend: `tsc --noEmit -p tsconfig.json` — **2 pre-existing errors, unrelated** (`lib/momentPostMapper.ts`, a type-predicate/optional-field mismatch; `test/smartFeedRankingLocation.test.ts`, a union-narrowing issue) plus one pre-existing test-config error (`test/mapPreviewSlideLayoutStability.test.ts`, `.ts` import-extension setting) — **zero errors in any file this batch touched**, confirmed by grepping the full error output for every touched filename.

## 35. Lint results

- Backend: `npm run lint` **cannot run** — pre-existing: ESLint v9 requires `eslint.config.js`, which does not exist in this repo (`api/`). Not caused by this batch.
- Frontend: the local `eslint` binary (`node_modules/.bin/eslint.exe`) **is blocked by this machine's Device Guard policy** ("was blocked by your organization's Device Guard policy") — an OS/organization-level restriction in this sandbox, not a code or config issue, and not something this batch introduced or can work around. TypeScript's clean result (§34) is the strongest automated signal available in its place.

## 36. Unrelated pre-existing failures (not touched, not caused by this batch)

- **Backend**: hundreds of failures/errors across unrelated domains (moment video transcoding/orphan-cleanup workers, checkout/reward concurrency, realtime sockets, notifications, admin event details, analytics) — sampled failures show `ECONNREFUSED 127.0.0.1:27017` (no local MongoDB in this environment), a missing local `ffmpeg`/`ffprobe`, and 5-second test timeouts, none of which reference banners. `event-taxonomy.test.ts` fails on a stale `xenog-dashboard` import path that doesn't exist in this checkout (the real directory is `admin/`) — a pre-existing broken cross-project import, confirmed unrelated since it was never opened in this batch. The full-suite failing-test-name set also differs somewhat between separate runs of the same code, indicating run-to-run non-determinism (shared timers/ports/concurrency) in this large suite that predates this work.
- **Frontend**: 11 failures + 1 error, identical by name across two full runs of this batch's changes, none referencing any file this batch touched (traced to `RepostFeedCard`, attendee-list privacy copy, video-playback release/reload logic, map-marker-glow constants, and a stale `getEventBadgeStatus(event, nowMs)` signature the test still expects but the source dropped `nowMs` from at some prior point).
- **Lint**: both backend (missing ESLint v9 config) and frontend (Device Guard policy block) are environment gaps, not code issues.

## 37. Is EVT-004 complete?

**Yes**, within its defined scope (copy-only). All three required copy changes are live on the active Create/Edit Basics screen, both legacy strings are gone from it, and Create/Edit terminology consistency was confirmed unaffected (same shared screen).

## 38. Is the approved narrow EVT-005 scope complete?

**Yes.** Single-banner architecture preserved; JPEG/PNG enforced client-side (metadata-based) and server-side (for the primary upload path, scoped to banner keys only — the local-dev-only fallback route is the one documented exception, §14); 15 MiB cap enforced client-side in binary bytes; banner required for Save Draft (frontend gate, zero API calls when missing) and for publish/any save (backend authority, three call sites, omit-preserves/explicit-clear-rejects semantics); invalid replacements provably don't mutate any state; draft reopen now genuinely preserves crop/display metadata (a real bug fixed as a direct consequence of this work); Editor/Feed/Detail/Map all resolve the same authoritative key and honor the same (currently-always-absent) crop metadata; card/hero/marker geometry is byte-identical to before; upload-percentage UI and storage-orphan cleanup were both deliberately not added.
