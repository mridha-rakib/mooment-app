import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Group Chat 404 fix: the chat-detail.tsx "more menu" previously
// rendered DM-only actions (Block Messages / Delete Conversation) for group
// threads too, sending a group id into an endpoint that expects a user id
// (POST /chat/dms/:groupId/message-block -> 404 "User not found"). Groups
// now get their own real, backend-authoritative membership action instead:
// Leave Group (POST /groups/:groupId/leave). DM behavior itself is
// unchanged — see chatBlockedState.test.ts / chatMessageBlockTab.test.ts.
//
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const chatDetailSource = readFileSync(join(process.cwd(), "app/chat-screen/chat-detail.tsx"), "utf8");
const chatLibSource = readFileSync(join(process.cwd(), "lib/chat.ts"), "utf8");
const messagesSource = readFileSync(join(process.cwd(), "app/(tabs)/messages.tsx"), "utf8");

test("Block Messages / Unblock menu item is DM-only, gated behind !isGroup", () => {
  assert.match(chatDetailSource, /\{!isGroup && \(fullBlockedMe && !fullBlockedByMe \? null : \(/);
});

test("Delete Conversation menu item is DM-only, gated behind !isGroup", () => {
  const deleteTextIndex = chatDetailSource.indexOf(">Delete Conversation<");
  assert.notEqual(deleteTextIndex, -1);
  const guardIndex = chatDetailSource.lastIndexOf("{!isGroup && (", deleteTextIndex);
  assert.notEqual(guardIndex, -1);
  // No unrelated closing of the !isGroup block between the guard and the label.
  assert.ok(!chatDetailSource.slice(guardIndex, deleteTextIndex).includes("Leave Group"));
});

test("a group thread never reaches the DM message-block or delete-conversation endpoints — no unguarded blockMessages/deleteConversation call remains for groups", () => {
  // Both DM-only calls must appear strictly inside an `!isGroup &&` block —
  // there must be no group-reachable call site left in the file.
  const blockCallIndex = chatDetailSource.indexOf("await blockMessages(friendId)");
  const deleteCallIndex = chatDetailSource.indexOf("await deleteConversation(friendId)");
  assert.notEqual(blockCallIndex, -1);
  assert.notEqual(deleteCallIndex, -1);

  const guardBefore = (callIndex: number) => chatDetailSource.lastIndexOf("!isGroup &&", callIndex);
  assert.ok(guardBefore(blockCallIndex) !== -1 && guardBefore(blockCallIndex) < blockCallIndex);
  assert.ok(guardBefore(deleteCallIndex) !== -1 && guardBefore(deleteCallIndex) < deleteCallIndex);
});

test("Leave Group menu item is rendered only for group threads (isGroup), calling the dedicated leaveGroup API — never blockMessages/deleteConversation", () => {
  assert.match(chatDetailSource, /\{isGroup && \(/);
  assert.match(chatDetailSource, /Leave Group/);
  assert.match(chatDetailSource, /await leaveGroup\(friendId\);/);
});

test("leaving shows a confirmation before calling the API, and does not compute an ownership successor on the frontend", () => {
  assert.match(chatDetailSource, /const confirmLeaveGroup = \(\) => \{/);
  assert.match(chatDetailSource, /Alert\.alert\(\s*'Leave Group',/);
  assert.doesNotMatch(chatDetailSource, /joinedAt/);
});

test("leave-group failures are caught and shown via Alert, never left as an unhandled promise rejection", () => {
  assert.match(chatDetailSource, /await leaveGroup\(friendId\);/);
  assert.match(
    chatDetailSource,
    /catch \(error\) \{\s*Alert\.alert\('Unable to leave group', getAuthErrorMessage\(error, 'Please try again\.'\)\);/,
  );
});

test("the DM block/unblock handler now also catches failures (previously try/finally with no catch — the source of the original uncaught AxiosError)", () => {
  assert.match(
    chatDetailSource,
    /setMessageBlockedByMe\(result\.isMessageBlocked\);\s*\}\s*\} catch \(error\) \{\s*Alert\.alert\('Unable to update block status', getAuthErrorMessage\(error, 'Please try again\.'\)\);/,
  );
});

test("app/lib/chat.ts exposes a dedicated leaveGroup(groupId) calling POST /groups/:groupId/leave — not a DM endpoint", () => {
  assert.match(chatLibSource, /export const leaveGroup = async \(groupId: string\)/);
  assert.match(chatLibSource, /api\.post\(`\/groups\/\$\{encodeURIComponent\(groupId\)\}\/leave`\)/);
});

test("Groups tab no longer offers a Blocked filter chip (no group-blocking feature exists)", () => {
  assert.match(
    messagesSource,
    /subTab === 'Groups' \? \(\['All', 'Unread'\] as const\) : \(\['All', 'Unread', 'Blocked'\] as const\)/,
  );
});

test("switching to Groups while Blocked was selected resolves to a valid Groups filter (All), not a hidden empty-list state", () => {
  assert.match(
    messagesSource,
    /useEffect\(\(\) => \{\s*if \(subTab === 'Groups' && topTab === 'Blocked'\) \{\s*setTopTab\('All'\);/,
  );
});

test("DMs keeps all three filters untouched, and isBlockedDmView's real GET /chat/dms/message-blocked flow is unaffected", () => {
  assert.match(messagesSource, /const isBlockedDmView = subTab === 'DMs' && topTab === 'Blocked';/);
  assert.match(messagesSource, /await getMessageBlockedUsers\(\);/);
});

test("no group-blocked state is synthesized to keep the removed filter alive — group conversations still hardcode isBlocked: false untouched", () => {
  assert.match(messagesSource, /isBlocked: false,/);
  assert.doesNotMatch(messagesSource, /blockedGroups|GroupBlock|groupBlock/);
});
