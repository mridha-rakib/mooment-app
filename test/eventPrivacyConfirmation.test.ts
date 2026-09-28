import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "app/event-screen/event.tsx"), "utf8");
const commitHandler = source.slice(
  source.indexOf("const commitPrivacyChange = async"),
  source.indexOf("const handlePrivacyChange ="),
);
const selectionHandler = source.slice(
  source.indexOf("const handlePrivacyChange ="),
  source.indexOf("const renderHeader = () =>"),
);
const privacyControl = source.slice(
  source.indexOf("{isHostMode &&"),
  source.indexOf("<View style={[styles.heroStatusStack"),
);

test("Public to Locked and Locked to Public selection require an accessible native confirmation before commit", () => {
  assert.match(selectionHandler, /event\.privacy === "public" && newPrivacy === "locked"/);
  assert.match(selectionHandler, /event\.privacy === "locked" && newPrivacy === "public"/);
  assert.match(selectionHandler, /Alert\.alert\(\s*"Change event access\?"/);
  assert.match(selectionHandler, /\{ text: "Cancel", style: "cancel" \}/);
  assert.match(selectionHandler, /text: "Confirm"/);
  assert.match(selectionHandler, /Existing attendees and issued tickets/);
  assert.doesNotMatch(selectionHandler, /await updateEvent\(/);
});

test("only confirmation commits the existing privacy-only request and server response remains authoritative", () => {
  assert.match(selectionHandler, /onPress: \(\) => \{\s*void commitPrivacyChange\(newPrivacy\);/);
  assert.match(commitHandler, /await updateEvent\(event\.id, \{ privacy: newPrivacy \}\)/);
  assert.doesNotMatch(commitHandler, /tickets:|availableCount:|attendees:|joinRequests:|capacity:/);
  assert.match(commitHandler, /mergeUpdatedEvent\(updatedEvent\)/);
  assert.match(commitHandler, /catch \(error\) \{\s*Alert\.alert\("Unable to update privacy"/);
});

test("cancel makes no request, duplicate confirms are guarded, and Private retains its immediate save path", () => {
  assert.match(selectionHandler, /if \(!requiresAccessConfirmation\) \{\s*void commitPrivacyChange\(newPrivacy\);/);
  assert.match(commitHandler, /if \(isUpdatingPrivacyRef\.current\) \{\s*return;/);
  assert.match(commitHandler, /isUpdatingPrivacyRef\.current = true;/);
  assert.match(commitHandler, /isUpdatingPrivacyRef\.current = false;/);
  assert.match(selectionHandler, /\{ text: "Cancel", style: "cancel" \}/);
});

test("privacy control remains host-only", () => {
  assert.match(privacyControl, /\{isHostMode &&/);
  assert.match(privacyControl, /onPress=\{\(\) => setPrivacyDropdownVisible\(true\)\}/);
});
