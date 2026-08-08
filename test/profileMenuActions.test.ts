import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const profileViewSource = readFileSync(
  join(process.cwd(), "components/profile/ProfileView.tsx"),
  "utf8",
);
const profileHeaderSource = readFileSync(
  join(process.cwd(), "components/profile/ProfileHeader.tsx"),
  "utf8",
);
const moreMenuSource = readFileSync(
  join(process.cwd(), "components/post/MoreMenuModal.tsx"),
  "utf8",
);

test("other-user profile menu replaces Save with Block/Unblock actions", () => {
  assert.match(profileViewSource, /onReport=\{!isOwnProfile \? handleReportPress : undefined\}/);
  assert.match(profileViewSource, /onBlock=\{!isOwnProfile && !user\.targetHasBlockedViewer \? handleProfileBlockMenuPress : undefined\}/);
  assert.match(profileViewSource, /blockLabel=\{user\.viewerHasBlockedTarget \? "Unblock" : "Block"\}/);
  assert.doesNotMatch(profileViewSource, /onSave=\{!isOwnProfile/);
  assert.doesNotMatch(profileViewSource, /Save unavailable/);
});

test("blocked profile menu keeps disabled Report and exposes Unblock only for outbound blocks", () => {
  assert.match(profileViewSource, /reportDisabled=\{hasProfileBlockRelationship\}/);
  assert.match(profileViewSource, /onBlock=\{user\.viewerHasBlockedTarget \? handleProfileBlockMenuPress : undefined\}/);
  assert.match(profileViewSource, /blockLabel="Unblock"/);
});

test("profile report handoff closes the menu before opening report", () => {
  assert.match(profileHeaderSource, /openReportAfterClose/);
  assert.match(moreMenuSource, /if \(!openReportAfterClose\)/);
  assert.match(moreMenuSource, /onReport\?\.\(\);\s*onClose\(\);/);
  assert.match(moreMenuSource, /onClose\(\);\s*InteractionManager\.runAfterInteractions/);
});

test("shared more menu preserves existing default block label", () => {
  assert.match(moreMenuSource, /blockLabel = "Block"/);
  assert.match(moreMenuSource, /\{blockLabel\}/);
  // reportDisabled (e.g. blocked-profile gating) and reported (already-reported
  // state) both disable the row — see ReportedContentCard/MoreMenuModal "Reported" support.
  assert.match(moreMenuSource, /accessibilityState=\{\(reportDisabled \|\| reported\) \? \{ disabled: true \} : undefined\}/);
});

test("more menu supports an already-reported filled-flag state distinct from reportDisabled", () => {
  assert.match(moreMenuSource, /reported\?:\s*boolean;/);
  assert.match(moreMenuSource, /reported = false/);
  assert.match(moreMenuSource, /if \(reportDisabled \|\| reported\)/);
  assert.match(moreMenuSource, /\{reported \? "Reported" : "Report"\}/);
});
