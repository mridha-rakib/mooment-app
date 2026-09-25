import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

const feedPostSource = read("components/post/FeedPost.tsx");
const eventFeedCardSource = read("components/home/EventFeedCard.tsx");
const eventDetailsSource = read("app/event-screen/event.tsx");
const profileViewSource = read("components/profile/ProfileView.tsx");
const productTabSource = read("components/eventTabs/ProductTab.tsx");
const reportDetailsModalSource = read("components/modals/ReportDetailsModal.tsx");
const reportedContentCardSource = read("components/post/ReportedContentCard.tsx");
const reportBlockFlowSource = read("lib/reportBlockFlow.ts");
const homeSource = read("app/(tabs)/home.tsx");

// --- FeedPost: Post report is a real submission, not the old console.log stub ---
test("FeedPost report is no longer a console.log stub", () => {
  assert.doesNotMatch(feedPostSource, /console\.log\('Reported for:/);
  assert.doesNotMatch(feedPostSource, /console\.log\('Report details:/);
  assert.doesNotMatch(feedPostSource, /\/\/ Final submission logic here/);
});

test("FeedPost calls submitReportWithOptionalBlock with targetType post and the post's real target/owner data", () => {
  assert.match(feedPostSource, /import \{ retryBlockOnly, submitReportWithOptionalBlock \} from '@\/lib\/reportBlockFlow';/);
  assert.match(feedPostSource, /targetType: 'post'/);
  assert.match(feedPostSource, /targetId: post\.id/);
  assert.match(feedPostSource, /reportedUserId: authorId/);
});

test("FeedPost has synchronous double-submit protection on report submit", () => {
  assert.match(feedPostSource, /isReportSubmittingRef\.current/);
});

// --- EventFeedCard: Event feed-card report is a real submission, not the old stub ---
test("EventFeedCard report is no longer a stub", () => {
  assert.doesNotMatch(eventFeedCardSource, /onDone=\{\(_details\) => \{\s*setShowReportDetailsModal\(false\);\s*\}\}/);
});

test("EventFeedCard calls submitReportWithOptionalBlock with targetType event and event.userId", () => {
  assert.match(eventFeedCardSource, /import \{ retryBlockOnly, submitReportWithOptionalBlock \} from "@\/lib\/reportBlockFlow";/);
  assert.match(eventFeedCardSource, /targetType: 'event'/);
  assert.match(eventFeedCardSource, /targetId: event\.id/);
  assert.match(eventFeedCardSource, /reportedUserId: event\.userId/);
});

// --- Product report remains unsupported until the backend contract includes products ---
test("Product report remains hidden/unsupported instead of exposing a console.log stub", () => {
  assert.doesNotMatch(productTabSource, /onReport=\{\(\) => console\.log\("Report product"\)\}/);
  assert.doesNotMatch(productTabSource, /onSave=\{\(\) => console\.log\("Save product"\)\}/);
  assert.doesNotMatch(productTabSource, /submitReportWithOptionalBlock/);
  assert.doesNotMatch(productTabSource, /createReport/);
});

// --- Event Details: existing report flow stays connected, TicketUsage eligibility preserved ---
test("Event Details report flow is connected through the shared orchestration and preserves TicketUsage eligibility", () => {
  assert.match(eventDetailsSource, /import \{ submitReportWithOptionalBlock \} from "@\/lib\/reportBlockFlow";/);
  assert.match(eventDetailsSource, /reportedUserId: event\.userId/);
  assert.match(eventDetailsSource, /targetType: "event"/);
  // The existing backend-driven eligibility gate (canReportEvent, derived from
  // TicketUsage server-side) still guards opening the report flow.
  assert.match(eventDetailsSource, /if \(!event \|\| isDraftPreview \|\| !canReportEvent \|\| hasReportedEvent\)/);
});

test("Event Details shows the optional block toggle and an already-reported disabled state", () => {
  assert.match(eventDetailsSource, /showBlockToggle/);
  assert.match(eventDetailsSource, /hasReportedEvent/);
});

// --- Profile (User) report is untouched by the new control ---
test("Profile report does not opt into the new block toggle, preserving existing behavior", () => {
  assert.doesNotMatch(profileViewSource, /showBlockToggle/);
});

// --- ReportDetailsModal: optional control, default OFF, reset per flow, backward compatible ---
test("ReportDetailsModal's block toggle defaults OFF and is opt-in via a prop", () => {
  assert.match(reportDetailsModalSource, /showBlockToggle\?:\s*boolean;/);
  assert.match(reportDetailsModalSource, /showBlockToggle = false/);
  assert.match(reportDetailsModalSource, /const \[alsoBlock, setAlsoBlock\] = useState\(false\)/);
});

test("ReportDetailsModal resets the toggle back to OFF every time the sheet opens fresh", () => {
  assert.match(reportDetailsModalSource, /const handleModalShow = useCallback\(\(\) => \{\s*translateY\.setValue\(0\);\s*keyboardInset\.setValue\(0\);\s*setAlsoBlock\(false\);/);
});

test("ReportDetailsModal passes alsoBlock through onDone without forcing it on existing callers", () => {
  assert.match(reportDetailsModalSource, /onDone: \(details: string, alsoBlock: boolean\) => Promise<void> \| void;/);
  assert.match(reportDetailsModalSource, /await onDone\(details, alsoBlock\);/);
});

// --- ReportedContentCard: Show action rules per outcome, no navigation ---
test("ReportedContentCard shows Show post/event only for report_only and report_block_failed, never for report_block_success", () => {
  assert.match(reportedContentCardSource, /const showShowAction = outcome === 'report_only' \|\| outcome === 'report_block_failed';/);
});

test("ReportedContentCard never navigates — it is a pure display component", () => {
  assert.doesNotMatch(reportedContentCardSource, /useRouter/);
  assert.doesNotMatch(reportedContentCardSource, /router\.push/);
});

test("ReportedContentCard exposes a retry action only for the block-failed outcome", () => {
  assert.match(reportedContentCardSource, /outcome === 'report_block_failed' && \(/);
});

// --- Feed slot swap: same component instance, no navigation for Show ---
test("FeedPost's Show action only flips local reveal state — no navigation, no new API fetch, no report re-submission", () => {
  assert.match(feedPostSource, /const handleShowReportedContent = \(\) => \{\s*setIsReportedContentRevealed\(true\);\s*\};/);
});

test("EventFeedCard's Show action only flips local reveal state — no navigation, no new API fetch", () => {
  assert.match(eventFeedCardSource, /const handleShowReportedContent = \(\) => \{\s*setIsReportedContentRevealed\(true\);\s*\};/);
});

test("FeedPost renders the reported-success card in the exact same component instance/slot, not a separate Feed item", () => {
  assert.match(feedPostSource, /if \(reportOutcome && !isReportedContentRevealed\) \{/);
});

test("EventFeedCard renders the reported-success card in the exact same component instance/slot, not a separate Feed item", () => {
  assert.match(eventFeedCardSource, /if \(reportOutcome && !isReportedContentRevealed\) \{/);
});

// --- Already-reported menu state ---
test("FeedPost's more-menu reflects hasReported via the shared Reported filled-flag support", () => {
  assert.match(feedPostSource, /reported=\{hasReported\}/);
  assert.match(feedPostSource, /const \[hasReported, setHasReported\] = useState\(Boolean\(post\.hasReported\)\)/);
});

test("EventFeedCard's more-menu reflects hasReported via the shared Reported filled-flag support", () => {
  assert.match(eventFeedCardSource, /reported=\{hasReported\}/);
  assert.match(eventFeedCardSource, /const \[hasReported, setHasReported\] = useState\(Boolean\(event\.hasReported\)\)/);
});

// --- Immediate local update + backend-authoritative restore across refresh ---
test("FeedPost immediately marks hasReported true after a successful submit, and syncs it from the backend-authoritative prop", () => {
  assert.match(feedPostSource, /setHasReported\(true\);/);
  assert.match(feedPostSource, /if \(post\.hasReported\) \{\s*setHasReported\(true\);\s*\}/);
});

// --- No N+1 / no per-item report-status polling introduced client-side ---
test("no per-item report-status API call or polling loop was introduced in Feed components", () => {
  for (const source of [feedPostSource, eventFeedCardSource, homeSource]) {
    assert.doesNotMatch(source, /getReportStatus|checkIfReported|reportStatus\(/);
    assert.doesNotMatch(source, /setInterval/);
  }
});

test("reportBlockFlow.ts introduces no polling, WebSocket, or new state library", () => {
  assert.doesNotMatch(reportBlockFlowSource, /setInterval|WebSocket|zustand|redux/i);
});

// --- Blocked-owner immediate Feed reflection (narrow local patch, not a new filtering system) ---
test("home.tsx patches only the newly-blocked owner's other already-rendered content, across posts/events/reposts", () => {
  assert.match(homeSource, /const handleUserBlockedFromReport = useCallback\(\(blockedOwnerId: string\) => \{/);
  assert.match(homeSource, /currentPosts\.filter\(\(post\) => post\.authorId !== blockedOwnerId\)/);
  assert.match(homeSource, /currentEvents\.filter\(\(event\) => event\.userId !== blockedOwnerId\)/);
  assert.match(homeSource, /share\.moment\.userId !== blockedOwnerId && share\.sharedBy\?\.id !== blockedOwnerId/);
});

test("home.tsx wires the blocked-owner callback into both FeedPost and EventFeedCard without altering unrelated props", () => {
  assert.match(homeSource, /onAuthorBlocked=\{handleUserBlockedFromReport\}/);
  assert.match(homeSource, /onHostBlocked=\{handleUserBlockedFromReport\}/);
  // Existing, unrelated wiring must remain intact.
  assert.match(homeSource, /onDeletePress=\{handleDeletePost\}/);
  assert.match(homeSource, /onRepostSuccess=\{refreshFeedAfterRepost\}/);
});

test("Feed FlatList configuration is unchanged by this feature", () => {
  assert.match(homeSource, /keyExtractor=\{\(item\) => item\.id\}/);
  assert.match(homeSource, /initialNumToRender=\{3\}/);
  assert.match(homeSource, /maxToRenderPerBatch=\{3\}/);
});

// --- Save/Block menu rows remain unchanged ---
test("Save and Block menu rows remain unchanged by the Reported-state addition", () => {
  for (const source of [feedPostSource, eventFeedCardSource]) {
    assert.match(source, /onSave=\{/);
    assert.match(source, /isSaved=\{/);
    assert.match(source, /onBlock=\{/);
  }
});

// --- Event report failure path never fabricates a success placeholder ---
test("a thrown report submission error (e.g. the existing TicketUsage 403) never sets a report outcome / success placeholder", () => {
  const submitMatch = feedPostSource.match(
    /const handleSubmitReport = async[\s\S]*?\n {2}\};/,
  );
  assert.ok(submitMatch, "handleSubmitReport not found in FeedPost.tsx");
  const body = submitMatch![0];
  const tryIndex = body.indexOf("try {");
  const catchIndex = body.indexOf("} catch (error) {");
  const setOutcomeIndex = body.indexOf("setReportOutcome(outcome.kind)");
  assert.ok(tryIndex >= 0 && catchIndex >= 0 && setOutcomeIndex >= 0);
  // setReportOutcome only happens inside the try block, before the catch.
  assert.ok(setOutcomeIndex > tryIndex && setOutcomeIndex < catchIndex);
  assert.match(body, /throw error;/);
});
