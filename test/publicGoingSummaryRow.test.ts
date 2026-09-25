import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the public going summary presentation rule. The attendee count is
// still calculated upstream; this component only decides whether to render
// the already-calculated summary row.

const publicGoingSummaryRowSource = readFileSync(
  join(process.cwd(), "components/events/PublicGoingSummaryRow.tsx"),
  "utf8",
);

test("going = 0 hides the going pressable/avatar row instead of rendering `0 going`", () => {
  const zeroGuardIndex = publicGoingSummaryRowSource.indexOf("if (summary.going <= 0)");
  const avatarSliceIndex = publicGoingSummaryRowSource.indexOf("const avatars = summary.avatars.slice(0, 3);");

  assert.notEqual(zeroGuardIndex, -1);
  assert.notEqual(avatarSliceIndex, -1);
  assert.ok(zeroGuardIndex < avatarSliceIndex);
  assert.match(publicGoingSummaryRowSource, /if \(summary\.going <= 0\) \{\s*return trailingText \? \(/);
});

test("going = 1 and higher still render the existing going text and accessibility label", () => {
  assert.match(publicGoingSummaryRowSource, /accessibilityLabel=\{`\$\{summary\.going\} going`\}/);
  assert.match(publicGoingSummaryRowSource, /\{summary\.going\} going/);
  assert.doesNotMatch(publicGoingSummaryRowSource, /summary\.going > 1/);
});

test("avatar preview behavior for positive counts is unchanged", () => {
  assert.match(publicGoingSummaryRowSource, /const avatars = summary\.avatars\.slice\(0, 3\);/);
  assert.match(publicGoingSummaryRowSource, /avatars\.map\(\(avatar, index\) =>/);
  assert.match(publicGoingSummaryRowSource, /<UserAvatar uri=\{avatarUri\} name=\{avatar\.name\} size=\{20\} \/>/);
});

test("this presentation fix does not change anonymous attendee handling or count validation", () => {
  assert.match(publicGoingSummaryRowSource, /typeof summary\?\.going === "number"/);
  assert.match(publicGoingSummaryRowSource, /Number\.isFinite\(summary\.going\)/);
  assert.doesNotMatch(publicGoingSummaryRowSource, /anonymous/);
});
