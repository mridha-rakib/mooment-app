import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Chat list light-mode fix. Root cause: unlike the Group
// conversation row (renderGroupItem), which already applied inline
// colors.* overrides, the DM conversation row (renderConvoItem) rendered
// entirely from static StyleSheet values — a translucent near-black card,
// white name text, light-gray meta text — with no theme branch at all, so
// it stayed dark-styled regardless of the theme setting. Source-level regex
// assertions, matching this repo's established convention (no React Native
// component render harness here).

const messagesSource = readFileSync(join(process.cwd(), "app/(tabs)/messages.tsx"), "utf8");

test("the DM conversation card gets a light-theme surface + border in light mode", () => {
  assert.match(
    messagesSource,
    /styles\.convoCard,\s*\/\/[\s\S]{0,400}!isDark && \{ backgroundColor: colors\.card, borderWidth: 1, borderColor: colors\.border \}/,
  );
});

test("the DM row name uses primary text in light mode", () => {
  assert.match(messagesSource, /styles\.convoName, !isDark && \{ color: colors\.text \}/);
});

test("the DM row message preview and timestamp use secondary text in light mode", () => {
  assert.match(messagesSource, /!isDark && \{ color: colors\.textSecondary \}/);
  assert.match(messagesSource, /styles\.convoTime, !isDark && \{ color: colors\.textSecondary \}/);
});

test("unread preview text uses primary text in light mode (not the frozen dark-mode white)", () => {
  assert.match(
    messagesSource,
    /item\.unread > 0 && \(isDark \? styles\.lastMsgUnread : \{ color: colors\.text, fontWeight: '500' \}\)/,
  );
});

test("dark mode's DM row keeps its exact pre-existing style keys (no override applied when isDark)", () => {
  // The base StyleSheet values (convoCard/convoName/convoTime/lastMsg/
  // lastMsgUnread) are untouched — only additive light-mode overrides were
  // introduced, gated behind `!isDark`.
  assert.match(messagesSource, /convoCard: \{\s*backgroundColor: 'rgba\(17, 17, 17, 0\.8\)',/);
  assert.match(messagesSource, /convoName: \{ color: '#FFFFFF',/);
  assert.match(messagesSource, /convoTime: \{ color: '#B3B3B3',/);
});

test("the All/Unread/Blocked filter pills get light-theme colors when active, in light mode only", () => {
  assert.match(
    messagesSource,
    /topTab === tab && \(isDark \? styles\.tabActive : \{ backgroundColor: colors\.backgroundSecondary, borderColor: colors\.border \}\)/,
  );
  assert.match(
    messagesSource,
    /topTab === tab && \(isDark \? \{ color: '#FFFFFF' \} : \{ color: colors\.text \}\)/,
  );
});

test("dark mode's active filter pill keeps its exact pre-existing style (tabActive untouched)", () => {
  assert.match(messagesSource, /tabActive: \{ backgroundColor: '#2C2C2E', borderColor: '#2C2C2E' \}/);
});

test("the DMs/Groups segmented control and its underlying component are untouched (already theme-aware)", () => {
  assert.match(messagesSource, /<SegmentedControl/);
  assert.doesNotMatch(messagesSource, /SegmentedControl[\s\S]{0,50}isDark/);
});

test("filter functionality (Unread/Blocked filtering logic) is unchanged", () => {
  assert.match(messagesSource, /if \(topTab === 'Unread'\) return c\.unread > 0;/);
  assert.match(messagesSource, /if \(topTab === 'Blocked'\) return Boolean\(c\.isBlocked\);/);
});

test("navigation to an opened conversation is unchanged", () => {
  assert.match(messagesSource, /pathname: '\/chat-screen\/chat-detail',/);
});
