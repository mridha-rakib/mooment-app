import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Batch A — selected friend chips + direct remove affordance in PeopleTagModal.
//
// Source-string assertions, matching this repo's convention (see
// peopleTagModalKeyboard.test.ts): no React Native render/interaction harness
// exists, so behavior is verified against the exact component source.

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

const source = read("components/post/PeopleTagModal.tsx");

// ── Search matching semantics are unchanged (audit-confirmed correct) ──

test("name/handle matching is still case-insensitive substring, with a single leading @ stripped on both sides", () => {
  assert.match(
    source,
    /const normalizedSearch = search\.trim\(\)\.toLowerCase\(\)\.replace\(\/\^@\/, ''\);/,
  );
  assert.match(
    source,
    /const filtered = friends\.filter\(p =>\s*\n\s*p\.name\.toLowerCase\(\)\.includes\(normalizedSearch\) \|\|\s*\n\s*p\.handle\.toLowerCase\(\)\.replace\(\/\^@\/, ''\)\.includes\(normalizedSearch\)\s*\n\s*\);/,
  );
});

// ── Selection identity / dedupe is unchanged ────────────────────────────

test("selection identity is still friend.id, toggled through the single existing toggle() function", () => {
  assert.match(
    source,
    /const toggle = \(friend: Friend\) => \{[\s\S]*?selectedFriend\.id === friend\.id[\s\S]*?setLocalSelected\(next\);\s*\n\s*onSelect\(next\);/,
  );
});

// ── Chips exist, derive from localSelected, and only from it ───────────

test("a selected-chips section exists and is gated on localSelected.length > 0 (no empty-state block)", () => {
  assert.match(source, /\{localSelected\.length > 0 && \(/);
  assert.match(source, /<Text style=\{styles\.selectedLabel\}>Selected<\/Text>/);
});

test("chips are rendered by mapping localSelected directly — no separate chip state", () => {
  assert.match(source, /\{localSelected\.map\(\(friend\) => \(/);
  assert.doesNotMatch(source, /useState[^\n]*[Cc]hip/);
});

test("each chip shows the friend's name and nothing else identity-bearing (no id/email/role rendered)", () => {
  assert.match(
    source,
    /<Text style=\{styles\.chipText\} numberOfLines=\{1\}>\{friend\.name\}<\/Text>/,
  );
  assert.doesNotMatch(source, /\{friend\.id\}<\/Text>/);
  assert.doesNotMatch(source, /\{friend\.email/);
});

// ── Remove affordance reuses the same toggle() as the row, no duplicate logic ──

test("chip remove calls the existing toggle(friend) — same source of truth as the row Add/Added button", () => {
  const chipRemoveMatch = source.match(
    /<TouchableOpacity\s*\n\s*onPress=\{\(\) => toggle\(friend\)\}[\s\S]*?<\/TouchableOpacity>/,
  );
  assert.ok(chipRemoveMatch, "expected a chip remove TouchableOpacity calling toggle(friend)");
});

test("chip remove has an accessible label naming the friend being removed", () => {
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityLabel=\{`Remove \$\{friend\.name\}`\}/);
});

// ── Row-level Add/Added toggle is still present alongside chips ────────

test("the existing row-level Add/Added toggle is unchanged", () => {
  assert.match(source, /onPress=\{\(\) => toggle\(item\)\}/);
  assert.match(source, /\{isAdded \? 'Added' : 'Add'\}/);
});

// ── Placement relative to search / list, and keyboard-safety ───────────

test("chips render between the search row and the results list, and don't opt out of keyboard-persist-taps", () => {
  const searchIdx = source.indexOf("Search bar");
  const chipsIdx = source.indexOf("Selected friends");
  const listIdx = source.indexOf("People list");
  assert.ok(searchIdx !== -1 && chipsIdx !== -1 && listIdx !== -1);
  assert.ok(searchIdx < chipsIdx && chipsIdx < listIdx, "expected search -> chips -> list order");
  assert.match(source, /<ScrollView\s*\n\s*horizontal\s*\n\s*showsHorizontalScrollIndicator=\{false\}\s*\n\s*keyboardShouldPersistTaps="handled"/);
});

// ── CRT-005 lines this batch must not have touched ──────────────────────

test("CRT-005 list sizing/keyboard lines remain byte-identical", () => {
  assert.match(source, /list: \{ flexGrow: 0, flexShrink: 1, maxHeight: 340 \}/);
  assert.match(source, /listWrapper: \{ flexShrink: 1, minHeight: 0 \}/);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.match(source, /keyboardDismissMode="on-drag"/);
});

// ── No new network request / no new dependency ──────────────────────────

test("no new dependency or per-chip network call was introduced", () => {
  assert.doesNotMatch(source, /@gorhom\/bottom-sheet|react-native-keyboard-controller/);
  assert.match(source, /getFriendUsers\(undefined, 100\)/);
  // Chips must not call getFriendUsers or any fetch per friend.
  const chipsBlockMatch = source.match(/Selected friends[\s\S]*?People list/);
  assert.ok(chipsBlockMatch);
  assert.doesNotMatch(chipsBlockMatch![0], /getFriendUsers|fetch\(|axios|api\.get/);
});
