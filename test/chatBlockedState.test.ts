import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers two related fixes to app/chat-screen/chat-detail.tsx:
//
// 1. The overflow ("more menu") popover — Unblock/Delete Conversation —
//    used static dark-only colors with no theme branch, so it stayed
//    dark-styled in light mode.
//
// 2. Chat's "Block" action previously called the SAME endpoint as
//    Profile's Full/Profile Block (blockUser/unblockUser -> POST/DELETE
//    /users/:id/block). This has been superseded by a second, entirely
//    separate "Message Block" system (xenog-api's DirectMessageBlock model,
//    chat-only — never touches follow/Feed/profile visibility). Chat's menu
//    now creates/removes ONLY a message block; the existing Full Block
//    remains reachable from this menu solely to *remove* one that already
//    exists (created via Profile), never to create a new one from Chat.
//    Full Block's UI takes precedence whenever present in either direction.
//    See test/chatMessageBlock.test.ts for the broader dual-block matrix
//    (backend split, mobile wrappers, Chat -> Blocked tab).
//
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const chatDetailSource = readFileSync(join(process.cwd(), "app/chat-screen/chat-detail.tsx"), "utf8");

// ── Part 1: light-mode menu (unchanged by the dual-block work) ───────────

test("the more-menu popover surface/border is theme-aware; dark mode's exact pre-existing style is untouched", () => {
  assert.match(chatDetailSource, /styles\.moreMenuBox, !isDark && \{ backgroundColor: colors\.card, borderColor: colors\.border \}/);
  assert.match(chatDetailSource, /moreMenuBox: \{ width: 210, backgroundColor: 'rgba\(30, 29, 33, 0\.95\)',/);
});

test("the Block/Unblock action text and icon are theme-aware", () => {
  assert.match(chatDetailSource, /color=\{isDark \? '#FFFFFF' : colors\.text\} style=\{styles\.moreMenuIcon\}/);
  assert.match(chatDetailSource, /styles\.moreMenuText, !isDark && \{ color: colors\.text \}/);
});

test("Delete Conversation keeps its destructive red identity, untouched by the theme fix", () => {
  assert.match(chatDetailSource, /color=\{CHAT_COLORS\.semanticError\} style=\{styles\.moreMenuIcon\}/);
  assert.match(chatDetailSource, /styles\.moreMenuText, \{ color: CHAT_COLORS\.semanticError \}/);
});

test("the menu divider is theme-aware", () => {
  assert.match(chatDetailSource, /styles\.moreMenuSeparator, !isDark && \{ backgroundColor: colors\.border \}/);
});

test("Delete Conversation's behavior (API call + navigation) is untouched", () => {
  assert.match(chatDetailSource, /await deleteConversation\(friendId\);/);
  assert.match(chatDetailSource, /safeBack\(router, '\/\(tabs\)\/messages'\);/);
});

// ── Part 2: dual block system — directional state, banner, menu ─────────

test("chat-detail.tsx fetches the combined Full+Message Block relationship from the chat module's own endpoint, not GET /users/:id", () => {
  assert.match(chatDetailSource, /getDirectMessageRelationship\(friendId\)/);
  assert.match(chatDetailSource, /setFullBlockedByMe\(relationship\.fullBlockedByMe\);/);
  assert.match(chatDetailSource, /setFullBlockedMe\(relationship\.fullBlockedMe\);/);
  assert.match(chatDetailSource, /setMessageBlockedByMe\(relationship\.messageBlockedByMe\);/);
  assert.match(chatDetailSource, /setMessageBlockedMe\(relationship\.messageBlockedMe\);/);
  assert.doesNotMatch(chatDetailSource, /getUserById/);
});

test("the directional fetch runs on focus (useFocusEffect), not just mount, so it picks up state after block/unblock elsewhere", () => {
  assert.match(chatDetailSource, /import \{ useFocusEffect \} from '@react-navigation\/native';/);
  assert.match(chatDetailSource, /useFocusEffect\(\s*useCallback\(\(\) => \{\s*if \(isGroup \|\| !isObjectId\(friendId\)\)/);
});

test("composer is unavailable when either block system is active in either direction", () => {
  assert.match(chatDetailSource, /const isFullBlocked = fullBlockedByMe \|\| fullBlockedMe;/);
  assert.match(chatDetailSource, /const isMessageBlocked = messageBlockedByMe \|\| messageBlockedMe;/);
  assert.match(
    chatDetailSource,
    /const isDirectChatUnavailable =\s*!isGroup && \(isDirectRecipientInvalid \|\| isSelfDirectConversation \|\| isFullBlocked \|\| isMessageBlocked \|\| Boolean\(directAccessError\)\);/,
  );
});

test("banner: Full Block copy/subtitle take precedence over Message Block whenever both are present", () => {
  assert.match(
    chatDetailSource,
    /fullBlockedByMe\s*\? 'You blocked this user\.'\s*: fullBlockedMe\s*\? "You can't reply to this conversation\."\s*: messageBlockedByMe\s*\? 'You blocked messages from this user\.'\s*: "You can't reply to this conversation\."/,
  );
  assert.match(chatDetailSource, /fullBlockedByMe \|\| messageBlockedByMe \? \(/);
  assert.match(
    chatDetailSource,
    /\{fullBlockedByMe \? 'Unblock them to send messages again\.' : 'Unblock messages to reply\.'\}/,
  );
});

test("menu: fullBlockedByMe keeps the existing full 'Unblock' action; fullBlockedMe hides the item entirely (no confusing duplicate toggle); the whole item is DM-only (never rendered for a group thread — see groupLeaveMenu.test.ts)", () => {
  assert.match(chatDetailSource, /\{!isGroup && \(fullBlockedMe && !fullBlockedByMe \? null : \(/);
  assert.match(
    chatDetailSource,
    /if \(fullBlockedByMe\) \{\s*const result = await unblockUser\(friendId\);\s*setFullBlockedByMe\(result\.isBlocked\);/,
  );
});

test("menu: with no Full Block present, the toggle is 'Block Messages'/'Unblock Messages', driven by the message-block system only", () => {
  assert.match(
    chatDetailSource,
    /const result = messageBlockedByMe\s*\? await unblockMessages\(friendId\)\s*: await blockMessages\(friendId\);\s*setMessageBlockedByMe\(result\.isMessageBlocked\);/,
  );
  assert.match(
    chatDetailSource,
    /\{fullBlockedByMe \? 'Unblock' : messageBlockedByMe \? 'Unblock Messages' : 'Block Messages'\}/,
  );
});

test("Chat can no longer CREATE a new Full Block — blockUser is not imported/called from chat-detail.tsx (only unblockUser, to remove an existing one)", () => {
  assert.match(chatDetailSource, /import \{ unblockUser \} from '@\/lib\/users';/);
  assert.doesNotMatch(chatDetailSource, /\bblockUser\(/);
});

test("no fake system message is stored/inserted into the message list for either block state — both are derived local banners", () => {
  assert.doesNotMatch(chatDetailSource, /fullBlocked(ByMe|Me)[\s\S]{0,120}setMessages/);
  assert.doesNotMatch(chatDetailSource, /messageBlocked(ByMe|Me)[\s\S]{0,120}setMessages/);
});

test("existing message history remains fully renderable while blocked (no filtering of `messages` based on block state)", () => {
  assert.doesNotMatch(chatDetailSource, /messages\.filter\([^)]*[Bb]lock/);
  assert.match(chatDetailSource, /data=\{reversedMessages\}/);
});

test("unblock (either system) restores the composer immediately via a direct state update, no screen remount needed", () => {
  // isDirectChatUnavailable/isBlockedConversation are plain derived
  // expressions (not memoized on a stale dependency array), so the next
  // render after setFullBlockedByMe/setMessageBlockedByMe automatically
  // restores the composer.
  assert.doesNotMatch(chatDetailSource, /isBlockedConversation = useMemo/);
  assert.doesNotMatch(chatDetailSource, /isDirectChatUnavailable = useMemo/);
});

test("multi-message-type sends (text/image/audio/location/event) all funnel through the single sendMessage() choke point, which already checks isDirectChatUnavailable", () => {
  assert.match(chatDetailSource, /const sendMessage = \(\) => \{\s*if \(isDirectChatUnavailable\) \{/);
  // Attachments (image/audio/location/event) are queued into pendingAttachments
  // and only dispatched by sendMessage — never sent directly from their own handlers.
  assert.match(chatDetailSource, /setPendingAttachments\(\(prev\) => \{/);
  assert.doesNotMatch(chatDetailSource, /handleShareLocation[\s\S]{0,2000}realtimeSocket\.emit/);
});

test("light-mode/dark-mode blocked-indicator theming: dark reuses existing CHAT_COLORS tokens, light branches via colors.*", () => {
  assert.match(chatDetailSource, /backgroundColor: CHAT_COLORS\.subtleSurface,\s*borderWidth: 1,\s*borderColor: CHAT_COLORS\.receiverBorder,/);
  assert.match(
    chatDetailSource,
    /styles\.blockedBanner,\s*!isDark && \{ backgroundColor: colors\.backgroundSecondary, borderColor: colors\.border \},/,
  );
});

test("no new Socket.IO events/architecture were introduced for this UI-only fix", () => {
  assert.doesNotMatch(chatDetailSource, /realtimeSocket\.(on|emit|subscribe)\([^)]*[Bb]lock/);
});
