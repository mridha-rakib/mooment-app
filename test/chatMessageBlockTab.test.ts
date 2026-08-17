import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers Chat -> DMs -> Blocked under the new dual-block product contract:
// this tab must now list MESSAGE-blocked users only (users blocked from
// this Chat menu), never Full/Profile-blocked users (which remain
// Profile -> Blocked Accounts' exclusive domain, unchanged, still backed by
// GET /users/me/blocked-users). The previous plan — wiring this tab to that
// same endpoint — is explicitly superseded; this tab now uses the new
// GET /chat/dms/message-blocked endpoint via app/lib/chat.ts's
// getMessageBlockedUsers().
//
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const messagesSource = readFileSync(join(process.cwd(), "app/(tabs)/messages.tsx"), "utf8");
const chatLibSource = readFileSync(join(process.cwd(), "lib/chat.ts"), "utf8");

test("the Blocked tab is driven by a dedicated message-blocked dataset, not dmConversations.filter(isBlocked) and not GET /users/me/blocked-users", () => {
  assert.match(messagesSource, /import \{ getDirectMessageConversations, getGroupConversations, getMessageBlockedUsers, unblockMessages \} from '@\/lib\/chat';/);
  assert.match(messagesSource, /const \[messageBlockedUsers, setMessageBlockedUsers\] = useState<MessageBlockedUserResponse\[\]>\(\[\]\);/);
  assert.match(messagesSource, /await getMessageBlockedUsers\(\);/);
  assert.doesNotMatch(messagesSource, /getBlockedUsers/);
});

test("membership rule: isBlockedDmView (the Blocked-tab data switch) requires both subTab === 'DMs' and topTab === 'Blocked'", () => {
  assert.match(messagesSource, /const isBlockedDmView = subTab === 'DMs' && topTab === 'Blocked';/);
});

test("the Blocked-tab list refetches both on topTab/subTab change and on screen focus, so an Unblock elsewhere is reflected without an app restart", () => {
  assert.match(messagesSource, /useEffect\(\(\) => \{\s*if \(isBlockedDmView\) \{\s*void loadMessageBlockedUsers\(\);/);
  assert.match(messagesSource, /useFocusEffect\(\s*useCallback\(\(\) => \{\s*if \(isBlockedDmView\) \{\s*void loadMessageBlockedUsers\(\);/);
});

test("a successful in-row Unblock removes the user from the local list immediately (no refetch/restart required)", () => {
  assert.match(
    messagesSource,
    /await unblockMessages\(user\.id\);\s*setMessageBlockedUsers\(\(current\) => current\.filter\(\(item\) => item\.id !== user\.id\)\);/,
  );
});

test("the blocked row is a dedicated, management-oriented layout — no fabricated lastMessage/unreadCount/isOnline fields feeding real UI", () => {
  const rowFnIndex = messagesSource.indexOf("const renderBlockedItem = ({ item }: { item: MessageBlockedUserResponse }) => {");
  assert.notEqual(rowFnIndex, -1);
  const rowFnEnd = messagesSource.indexOf("const renderRoomItem", rowFnIndex);
  const rowFnSource = messagesSource.slice(rowFnIndex, rowFnEnd);
  assert.doesNotMatch(rowFnSource, /\.lastMessage\b|\.unread\b|\.isOnline\b/);
  assert.match(rowFnSource, /item\.name/);
});

test("tapping a blocked row opens the existing direct conversation via the same handleOpenConversation navigation used elsewhere — no fake conversation id", () => {
  assert.match(messagesSource, /onPress=\{\(\) => handleOpenConversation\(\{\s*id: item\.id,\s*name: item\.name,\s*avatar: item\.avatarUrl \?\? null,/);
});

test("the Blocked-tab empty state uses dedicated copy, never the generic 'No friends found' fallback", () => {
  assert.match(messagesSource, /\{messageBlockedError \?\? 'No blocked users'\}/);
});

test("Profile -> Blocked Accounts semantics are untouched: still backed by GET /users/me/blocked-users, via a completely separate file", () => {
  const blockedAccountsSource = readFileSync(join(process.cwd(), "app/profile-screen/blocked-accounts.tsx"), "utf8");
  assert.match(blockedAccountsSource, /getBlockedUsers\(nextPage, PAGE_SIZE\)/);
  assert.doesNotMatch(blockedAccountsSource, /getMessageBlockedUsers|message-blocked/);
});

test("app/lib/chat.ts exposes the message-block wrappers, kept separate from the Full Block wrappers in app/lib/users.ts", () => {
  assert.match(chatLibSource, /export const blockMessages = async \(friendId: string\)/);
  assert.match(chatLibSource, /export const unblockMessages = async \(friendId: string\)/);
  assert.match(chatLibSource, /export const getMessageBlockedUsers = async \(/);
  assert.match(chatLibSource, /api\.post\(`\/chat\/dms\/\$\{encodeURIComponent\(friendId\)\}\/message-block`\)/);
  assert.match(chatLibSource, /api\.delete\(`\/chat\/dms\/\$\{encodeURIComponent\(friendId\)\}\/message-block`\)/);
  assert.match(chatLibSource, /api\.get\("\/chat\/dms\/message-blocked"/);
});

test("app/lib/chat.ts exposes the combined relationship fetch used by chat-detail.tsx", () => {
  assert.match(chatLibSource, /export const getDirectMessageRelationship = async \(friendId: string\)/);
  assert.match(chatLibSource, /api\.get\(`\/chat\/dms\/\$\{encodeURIComponent\(friendId\)\}\/relationship`\)/);
});

test("All/Unread filters and Groups subTab are untouched — they still use the original client-side filter over dmConversations/groupConversations", () => {
  assert.match(messagesSource, /if \(topTab === 'Unread'\) return c\.unread > 0;/);
  assert.match(messagesSource, /const sourceConversations = subTab === 'DMs' \? dmConversations : groupConversations;/);
});
