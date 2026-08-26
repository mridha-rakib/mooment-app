import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the "Event Share not working" fix.
//
// Root cause: EventFeedCard passed `shareDisabled={!event.interactionMomentId}`
// into PostInteractionBar, which disables the entire Share action (and thus
// blocks opening ShareModal at all) whenever interactionMomentId is absent —
// even though only Repost (via shareMoment) actually needs that id. Copy
// Link, WhatsApp, Facebook, Messenger, Instagram, native Share, and
// share-to-friend only need the event id/url, which is always available.
//
// Fix: Share always opens; only the Repost tile inside the existing
// ShareModal is gated (via its pre-existing `!onRepost` disabled/opacity
// styling — no new UI) by passing onRepost conditionally.
//
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");
const postInteractionBarSource = readFileSync(join(process.cwd(), "components/post/PostInteractionBar.tsx"), "utf8");
const shareModalSource = readFileSync(join(process.cwd(), "components/post/ShareModal.tsx"), "utf8");
const chatSource = readFileSync(join(process.cwd(), "lib/chat.ts"), "utf8");

test("Test 1 — Share action is no longer gated by interactionMomentId, so it always opens ShareModal", () => {
  assert.doesNotMatch(eventFeedCardSource, /shareDisabled=\{!event\.interactionMomentId\}/);
  assert.match(eventFeedCardSource, /onSharePress=\{\(\) => setShareVisible\(true\)\}/);
  assert.match(eventFeedCardSource, /<ShareModal\s*\n\s*visible=\{shareVisible\}/);
});

test("Test 2 — friend endpoint calls the real /chat/dms route", () => {
  assert.match(chatSource, /await api\.get\("\/chat\/dms", \{ params: options \}\);/);
});

test("Test 3 — external share/deep-link actions use the event URL directly and never depend on friend loading", () => {
  // nativeShare/copyLink/handleAction only read `shareUrl`/Linking, never conversations/friends state.
  assert.match(shareModalSource, /const nativeShare = async \(\) => \{\s*\n\s*await Share\.share\(\{ message: shareUrl/);
  assert.match(shareModalSource, /const encodedUrl = encodeURIComponent\(shareUrl/);
  assert.doesNotMatch(
    shareModalSource.slice(shareModalSource.indexOf("const nativeShare"), shareModalSource.indexOf("const submitRepost")),
    /conversations|isLoadingFriends/,
  );
});

test("Test 4 — Repost still goes through the existing interaction-moment/shareMoment path when interactionMomentId is present", () => {
  assert.match(eventFeedCardSource, /const share = await shareMoment\(event\.interactionMomentId, payload\);/);
  assert.match(eventFeedCardSource, /onRepost=\{event\.interactionMomentId \? handleRepost : undefined\}/);
});

test("Test 5 — missing interactionMomentId disables only the Repost tile (existing ShareModal styling), not the whole Share button", () => {
  // ShareModal's pre-existing disabled treatment for the repost tile — reused, not redesigned.
  assert.match(
    shareModalSource,
    /style=\{\[styles\.item, action\.id === 'repost' && \(!onRepost \|\| isReposting\) && styles\.disabled\]\}/,
  );
  assert.match(shareModalSource, /disabled=\{action\.id === 'repost' && \(!onRepost \|\| isReposting\)\}/);
  // No id-faking: EventFeedCard never invents a placeholder interactionMomentId.
  assert.doesNotMatch(eventFeedCardSource, /interactionMomentId\s*\?\?\s*['"`]/);
});

test("Test 6 — external share paths never call shareMoment/mutate share count; only Repost does", () => {
  const beforeRepost = shareModalSource.slice(0, shareModalSource.indexOf("const submitRepost"));
  assert.doesNotMatch(beforeRepost, /shareMoment\(/);
  assert.match(shareModalSource, /await onRepost\(\{/);
});

test("Test 7 — Feed and Profile share the same EventFeedCard/PostInteractionBar wiring (no duplicated share logic)", () => {
  assert.match(postInteractionBarSource, /onPress=\{onSharePress\}/);
  assert.match(postInteractionBarSource, /disabled=\{shareDisabled \|\| !onSharePress\}/);
  // shareDisabled still exists as a prop (other callers, e.g. view-story, may use it) but EventFeedCard no longer sets it.
  assert.match(postInteractionBarSource, /shareDisabled\?: boolean;/);
});
