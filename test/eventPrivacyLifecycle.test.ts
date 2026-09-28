import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const stepFive = readFileSync(join(process.cwd(), "app/create-event/step-5.tsx"), "utf8");
const eventDetail = readFileSync(join(process.cwd(), "app/event-screen/event.tsx"), "utf8");

const initialSelector = stepFive.slice(
  stepFive.indexOf("{/* Public Event */}"),
  stepFive.indexOf("</View>\n\n      {/* Spacer */}"),
);
const privacyHandler = eventDetail.slice(
  eventDetail.indexOf("const handlePrivacyChange ="),
  eventDetail.indexOf("const renderHeader = () =>"),
);
const privacyCommitHandler = eventDetail.slice(
  eventDetail.indexOf("const commitPrivacyChange = async"),
  eventDetail.indexOf("const handlePrivacyChange ="),
);

test("initial create exposes exactly Public and Private, with confirmed privacy copy", () => {
  assert.match(initialSelector, /onPress=\{\(\) => handlePrivacyChange\('public'\)\}/);
  assert.match(initialSelector, /onPress=\{\(\) => handlePrivacyChange\('private'\)\}/);
  assert.doesNotMatch(initialSelector, /handlePrivacyChange\('locked'\)/);
  assert.match(initialSelector, /Discoverable by everyone\. People can view the Event and join through the normal ticket or access flow without host approval\./);
  assert.match(initialSelector, /Invite or direct-access only\. The Event is hidden from public discovery and cannot be publicly reposted\./);
  assert.doesNotMatch(initialSelector, /if anybody buy tickets|hold the tickets to being sell/i);
});

test("draft Preview reuses the privacy selector for Public-to-Locked before publishing", () => {
  assert.match(privacyCommitHandler, /isDraftPreview\s*\n\s*\? await saveEventDraft\(\{ privacy: newPrivacy \}, event\.id\)/);
  assert.match(eventDetail, /onPress=\{\(\) => handlePrivacyChange\("locked"\)\}/);
  assert.match(eventDetail, /\(!isDraftPreview \|\| event\?\.privacy !== "private"\)/);
  assert.match(eventDetail, /\{!isDraftPreview && \(/);
  assert.match(eventDetail, /const updated = await publishSavedEventDraft\(payload, event\.id\);/);
});

test("published privacy management uses the existing privacy-only update path for all three values", () => {
  assert.match(privacyCommitHandler, /newPrivacy: EventPrivacy/);
  assert.match(privacyCommitHandler, /: await updateEvent\(event\.id, \{ privacy: newPrivacy \}\)/);
  for (const privacy of ["public", "locked", "private"]) {
    assert.match(eventDetail, new RegExp(`handlePrivacyChange\\(\\"${privacy}\\"\\)`));
  }
});
