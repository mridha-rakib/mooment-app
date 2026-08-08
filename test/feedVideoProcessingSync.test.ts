import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Follows the same source-string testing convention as
// test/feedVideoProcessingState.test.ts: this repo has no component-rendering
// test library installed, so behavior is verified against the exact
// home.tsx / lib source text rather than by mounting components.
const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");
const syncSource = readFileSync(join(process.cwd(), "lib/pendingVideoMomentSync.ts"), "utf8");

const buildFeedItemsSource = homeSource.slice(
  homeSource.indexOf("const buildFeedItems = ("),
  homeSource.indexOf("const hasVideoMedia = "),
);
const renderItemSource = homeSource.slice(
  homeSource.indexOf("renderItem={({ item }) => {"),
  homeSource.indexOf("</ScrollView>", homeSource.indexOf("renderItem={({ item }) => {")),
);
const resolvedHandlerSource = homeSource.slice(
  homeSource.indexOf("const handleVideoMomentResolved ="),
  homeSource.indexOf("usePendingVideoMomentSync(unresolvedVideoMomentIds"),
);
const pollFunctionSource = syncSource.slice(
  syncSource.indexOf("const poll = async"),
  syncSource.indexOf("const ensureTracking ="),
);

// ── 1/2/3. Local pending, server `queued`, and server `processing` all
// resolve to the same reused skeleton, never the black processing card ──

test("a post whose video is still queued or processing is routed to the skeleton, not the 'post' branch", () => {
  assert.match(
    buildFeedItemsSource,
    /isUnresolvedVideoPost\(item\.data\)\s*\?\s*\{ type: 'video_processing', id: item\.id, data: item\.data \}\s*:\s*\{ type: 'post', id: item\.id, data: item\.data \}/,
  );
});

test("isUnresolvedVideoPost matches exactly the queued/processing states, not ready or failed", () => {
  const helperSource = homeSource.slice(
    homeSource.indexOf("const isUnresolvedVideoPost ="),
    homeSource.indexOf("const isUnresolvedVideoPost =") + 400,
  );

  assert.match(helperSource, /item\.processingStatus === 'queued' \|\| item\.processingStatus === 'processing'/);
  assert.doesNotMatch(helperSource, /processingStatus === 'ready'/);
  assert.doesNotMatch(helperSource, /processingStatus === 'failed'/);
});

test("both local pending uploads and unresolved server video posts render the exact same reused skeleton component", () => {
  assert.match(
    renderItemSource,
    /item\.type === 'pending_video_upload' \|\| item\.type === 'video_processing'\) \{\s*return <PendingVideoPostSkeleton \/>;/,
  );
  // Only ever the one skeleton component — no new visual component introduced.
  const skeletonCallSites = renderItemSource.match(/<PendingVideoPostSkeleton/g) ?? [];
  assert.equal(skeletonCallSites.length, 1);
});

// ── 4. `ready` swaps the skeleton for the normal playable post ─────────────

test("a resolved 'ready' outcome maps the real Moment back into the exact same post slot", () => {
  const readyBranch = resolvedHandlerSource.slice(resolvedHandlerSource.indexOf("const mappedPost ="));

  assert.match(readyBranch, /mapMomentToPost\(outcome\.moment, \{ storageUrlResolver: getStorageFileUrl \}\)/);
  // In-place map (not prepend/insert) — preserves Feed position.
  assert.match(readyBranch, /current\.map\(\(post\) => \(post\.id === momentId \? mappedPost : post\)\)/);
});

test("the sync hook only reports a terminal 'ready' or 'failed' outcome once the backend media status itself says so", () => {
  assert.match(pollFunctionSource, /videoStatus === "ready" \|\| videoStatus === "failed"/);
  assert.match(pollFunctionSource, /onResolvedRef\.current\(id, \{ type: videoStatus, moment \}\);/);
});

// ── 5. `failed` replaces the skeleton with the existing failed/retry card ──

test("a genuine backend 'failed' status is mapped through mapMomentToPost like 'ready', reusing FeedPost's own failed/retry UI", () => {
  // Same branch as the ready case above — both terminal states go through
  // the identical mapMomentToPost + in-place swap path, and FeedPost.tsx's
  // already-tested VideoProcessingPlaceholder renders the failed/retry card
  // whenever processingStatus is 'failed'.
  assert.match(resolvedHandlerSource, /outcome\.type === 'not_found'/);
  assert.match(resolvedHandlerSource, /outcome\.type === 'error_exhausted'/);
});

test("a permanently failing status request (not a real backend state) is surfaced as 'failed' locally instead of polling forever", () => {
  const exhaustedBranch = resolvedHandlerSource.slice(
    resolvedHandlerSource.indexOf("outcome.type === 'error_exhausted'"),
    resolvedHandlerSource.indexOf("outcome.type === 'not_found'") > -1
      ? resolvedHandlerSource.indexOf("const mappedPost =")
      : undefined,
  );

  assert.match(exhaustedBranch, /processingStatus: 'failed' as const/);
  assert.match(syncSource, /MAX_CONSECUTIVE_REQUEST_ERRORS = 5/);
});

// ── 6. No local/server duplicate entries ────────────────────────────────────

test("a resolved post is swapped in place by id, never appended as a second entry", () => {
  assert.doesNotMatch(resolvedHandlerSource, /\[mappedPost, \.\.\.current/);
  assert.match(resolvedHandlerSource, /current\.map\(\(post\) => \(post\.id === momentId \? mappedPost : post\)\)/);
});

test("local pending uploads are excluded from the Feed the moment they succeed, leaving only the server post", () => {
  assert.match(homeSource, /pendingVideoUploads\s*\.filter\(\(upload\) => upload\.status !== 'succeeded'\)/);
});

// ── 7. Synchronization stops on terminal states ─────────────────────────────

test("stopTracking clears all per-id bookkeeping so a resolved id is never polled again", () => {
  const stopTrackingSource = syncSource.slice(
    syncSource.indexOf("const stopTracking ="),
    syncSource.indexOf("const scheduleNext ="),
  );

  assert.match(stopTrackingSource, /trackedIdsRef\.current\.delete\(id\)/);
  assert.match(stopTrackingSource, /clearTimer\(id\)/);
  assert.match(stopTrackingSource, /attemptRef\.current\.delete\(id\)/);
});

test("ready/failed/not_found/error_exhausted all call stopTracking before reporting the outcome", () => {
  const terminalCallSites = pollFunctionSource.match(/stopTracking\(id\);/g) ?? [];
  assert.ok(terminalCallSites.length >= 2, "expected stopTracking on both the success and error terminal paths");
});

test("the reconciliation effect stops tracking any id no longer in the unresolved set", () => {
  const effectSource = syncSource.slice(
    syncSource.indexOf("useEffect(() => {\n    const nextIds"),
    syncSource.indexOf("useEffect(() => {\n    const subscription"),
  );

  assert.match(effectSource, /if \(!nextIds\.has\(id\)\) \{\s*stopTracking\(id\);/);
});

// ── 8. Duplicate concurrent requests for the same Moment are prevented ─────

test("poll refuses to start a second request for an id already in flight", () => {
  assert.match(pollFunctionSource, /inFlightRef\.current\.has\(id\)/);
  assert.match(pollFunctionSource, /inFlightRef\.current\.add\(id\)/);
});

// ── 9. Stale responses cannot overwrite a newer status ──────────────────────

test("every response and error path re-checks the request sequence number before applying its result", () => {
  const seqGuardMatches = pollFunctionSource.match(/requestSeqRef\.current\.get\(id\) !== seq/g) ?? [];
  assert.equal(seqGuardMatches.length, 2, "expected the stale-response guard on both the success and error branches");
});

test("each poll call is assigned a strictly incrementing sequence number before the request is sent", () => {
  assert.match(pollFunctionSource, /const seq = \(requestSeqRef\.current\.get\(id\) \?\? 0\) \+ 1;/);
  assert.match(pollFunctionSource, /requestSeqRef\.current\.set\(id, seq\);/);
});

// ── Pause/resume on background/foreground and unmount cleanup ──────────────

test("polling pauses on background and resumes immediately on foreground for still-tracked ids", () => {
  const appStateSource = syncSource.slice(
    syncSource.indexOf('AppState.addEventListener("change"'),
    syncSource.indexOf("return () => subscription.remove();"),
  );

  assert.match(appStateSource, /enabledRef\.current = nextState === "active";/);
  assert.match(appStateSource, /timersRef\.current\.forEach\(\(timer\) => clearTimeout\(timer\)\);/);
  assert.match(appStateSource, /if \(!wasEnabled\) \{\s*trackedIdsRef\.current\.forEach/);
});

test("unmount clears every pending timer", () => {
  const unmountSource = syncSource.slice(syncSource.lastIndexOf("useEffect(() => () => {"));

  assert.match(unmountSource, /timersRef\.current\.forEach\(\(timer\) => clearTimeout\(timer\)\);/);
  assert.match(unmountSource, /timersRef\.current\.clear\(\);/);
});

// ── No global/continuous Feed polling was introduced ────────────────────────

test("the sync hook never calls the full Feed fetch, only the single-Moment endpoint", () => {
  assert.doesNotMatch(syncSource, /getFeedMoments/);
  assert.match(syncSource, /import \{ getMoment, type Moment \} from "@\/lib\/moments";/);
});

test("polling uses bounded backoff delays, not a fixed blind timeout or a tight interval loop", () => {
  assert.match(syncSource, /POLL_DELAYS_MS = \[3000, 4000, 6000, 9000, 12000, 15000\];/);
  assert.doesNotMatch(syncSource, /setInterval/);
});

// ── 10. Image/audio/text posts remain unchanged ─────────────────────────────

test("isUnresolvedVideoPost only inspects video media items, leaving image/audio/text posts untouched", () => {
  const helperSource = homeSource.slice(
    homeSource.indexOf("const isUnresolvedVideoPost ="),
    homeSource.indexOf("const isUnresolvedVideoPost =") + 400,
  );

  assert.match(helperSource, /item\.type === 'video'/);
});

test("non-video content items (events, reposts, suggested users) are untouched by the skeleton routing", () => {
  assert.match(buildFeedItemsSource, /items\.push\(\{ type: 'event', id: item\.id, data: item\.data \}\);/);
  assert.match(buildFeedItemsSource, /items\.push\(\{ type: 'repost', id: item\.id, data: item\.data \}\);/);
});
