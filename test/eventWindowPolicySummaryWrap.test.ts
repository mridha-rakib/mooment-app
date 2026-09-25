import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Regression test for the Event Window card's policy summary line
// ("Checked-in attendees can post · Gallery available after you post")
// overflowing past the card's right edge on Android. Root cause: the two
// summary strings + separator dot were three sibling <Text> elements inside
// a `flexDirection: "row"` View — RN row children don't wrap word-by-word,
// so a long combined sentence rendered past the card width. This repo has
// no React Native component test harness (see eventWindowEligibilityUI.test.ts),
// so this asserts against the source wiring rather than rendered output.

const attendeeWindowsSource = readFileSync(
  join(process.cwd(), "components/eventTabs/AttendeeEventWindowsTab.tsx"),
  "utf8",
);

test("policy summary is a single Text tree (nested Text spans), not sibling Texts in a flex row", () => {
  // The fix: one outer <Text> containing the eligibility summary, a nested
  // <Text> for the dot, and the visibility summary — this lets RN wrap the
  // sentence naturally like inline text, bounded by the card's own width,
  // instead of relying on flexbox row sizing.
  assert.match(
    attendeeWindowsSource,
    /<Text style=\{\[styles\.policySummaryText, \{ color: colors\.textSecondary \}\]\}>\s*\{POSTING_ELIGIBILITY_SUMMARY\[window\.postingEligibility\]\}\s*<Text style=\{styles\.policySummaryDot\}> · <\/Text>\s*\{PARTICIPANT_VISIBILITY_SUMMARY\[window\.participantPostVisibility\]\}\s*<\/Text>/,
  );

  // No leftover row-flex wrapper around the policy summary that would
  // reintroduce the overflow bug.
  assert.doesNotMatch(attendeeWindowsSource, /policySummaryRow/);
});

test("policySummaryText style carries no fixed/row-flex sizing that would force overflow", () => {
  const styleMatch = attendeeWindowsSource.match(/policySummaryText: (\{[^}]*\})/);
  assert.ok(styleMatch, "expected a policySummaryText style entry");
  const styleBody = styleMatch![1];

  assert.doesNotMatch(styleBody, /width:/);
  assert.doesNotMatch(styleBody, /flexDirection/);
  assert.doesNotMatch(styleBody, /numberOfLines/);
});

test("card geometry (padding, radius, width) and unrelated window UI are untouched", () => {
  assert.match(
    attendeeWindowsSource,
    /windowCard: \{ borderWidth: StyleSheet\.hairlineWidth, borderRadius: 8, padding: 16, marginBottom: 14 \}/,
  );
  // Slot count, status badge, and content-type chips are rendered independently
  // of the policy summary line and must remain wired exactly as before.
  assert.match(attendeeWindowsSource, /\{window\.remainingSlots\} of \{window\.maxPosts\} slots remaining/);
  assert.match(attendeeWindowsSource, /styles\.statusBadge/);
  assert.match(attendeeWindowsSource, /styles\.typeBadge/);
});

test("policy summary copy strings are unchanged", () => {
  assert.match(attendeeWindowsSource, /ticket_holders: "Ticket holders can post"/);
  assert.match(attendeeWindowsSource, /checked_in_attendees: "Checked-in attendees can post"/);
  assert.match(attendeeWindowsSource, /instant: "Gallery available after you post"/);
  assert.match(attendeeWindowsSource, /end_of_event: "Gallery available after the event ends"/);
});
