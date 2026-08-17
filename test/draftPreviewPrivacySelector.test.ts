import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const eventDetailsSource = readFileSync(
  join(process.cwd(), "app/event-screen/event.tsx"),
  "utf8",
);

const renderHeaderSection = eventDetailsSource.slice(
  eventDetailsSource.indexOf("const renderHeader = () =>"),
  eventDetailsSource.indexOf("if (isLoading) {"),
);
const handlePrivacyChangeSection = eventDetailsSource.slice(
  eventDetailsSource.indexOf("const handlePrivacyChange = async"),
  eventDetailsSource.indexOf("const renderHeader = () =>"),
);
const privacyDropdownSection = eventDetailsSource.slice(
  eventDetailsSource.indexOf("visible={privacyDropdownVisible}"),
  eventDetailsSource.indexOf("visible={menuVisible}"),
);

test("draft host reaches the Public/Locked pill: !isDraftPreview no longer blocks the header render condition", () => {
  assert.doesNotMatch(renderHeaderSection, /isHostMode && !isDraftPreview/);
  assert.match(
    renderHeaderSection,
    /isHostMode && event\?\.privacy !== "private" && !isEventCompleted && !isEventCancelled/,
  );
});

test("Private events still hide the selector regardless of draft/published status", () => {
  assert.match(renderHeaderSection, /event\?\.privacy !== "private"/);
});

test("Completed/cancelled events still hide the selector", () => {
  assert.match(renderHeaderSection, /!isEventCompleted && !isEventCancelled/);
});

test("handlePrivacyChange no longer early-returns for draft preview", () => {
  assert.doesNotMatch(handlePrivacyChangeSection, /isDraftPreview \|\| !isHostMode/);
  assert.match(
    handlePrivacyChangeSection,
    /if \(!event \|\| !isHostMode \|\| isUpdatingPrivacy \|\| event\.privacy === newPrivacy\)/,
  );
});

test("handlePrivacyChange still no-ops for completed/cancelled events (unchanged safety guard)", () => {
  assert.match(handlePrivacyChangeSection, /if \(isEventCompleted \|\| isEventCancelled\) \{\s*\n\s*return;/);
});

test("Draft privacy change routes through saveEventDraft (draft-native API), not updateEvent", () => {
  assert.match(
    handlePrivacyChangeSection,
    /const updatedEvent = isDraftPreview\s*\n\s*\? await saveEventDraft\(\{ privacy: newPrivacy \}, event\.id\)\s*\n\s*: await updateEvent\(event\.id, \{ privacy: newPrivacy \}\);/,
  );
});

test("Published privacy change still uses the existing updateEvent call in the non-draft branch", () => {
  assert.match(handlePrivacyChangeSection, /: await updateEvent\(event\.id, \{ privacy: newPrivacy \}\);/);
});

test("saveEventDraft is imported from the shared events lib (no duplicate/new API client added)", () => {
  const importSection = eventDetailsSource.slice(0, eventDetailsSource.indexOf('} from "@/lib/events";'));
  assert.match(importSection, /saveEventDraft,/);
});

test("Both draft and published branches merge the response through the existing mergeUpdatedEvent helper (single local-state update path)", () => {
  assert.match(handlePrivacyChangeSection, /mergeUpdatedEvent\(updatedEvent\);/);
  const mergeCalls = handlePrivacyChangeSection.match(/mergeUpdatedEvent\(updatedEvent\);/g);
  assert.equal(mergeCalls?.length, 1);
});

test("Existing Public/Locked dropdown JSX (trigger pill, modal, icons, styles) is untouched — no duplicate selector was created", () => {
  assert.match(privacyDropdownSection, /onPress=\{\(\) => handlePrivacyChange\("public"\)\}/);
  assert.match(privacyDropdownSection, /onPress=\{\(\) => handlePrivacyChange\("locked"\)\}/);
  assert.match(privacyDropdownSection, /color=\{isDark \? "#FFFFFF" : colors\.text\}/);
  assert.match(privacyDropdownSection, /backgroundColor: isDark \? "#2A2A2A" : colors\.card/);
  assert.doesNotMatch(eventDetailsSource, /DraftPrivacyDropdown/);
  assert.doesNotMatch(eventDetailsSource, /privacyDropdownVisible2|draftPrivacyDropdown/);
});

test("Trigger pill styling (theme-independent white-on-hero-image treatment) is unchanged", () => {
  assert.match(renderHeaderSection, /style=\{styles\.privacyPill\}/);
  assert.match(renderHeaderSection, /disabled=\{isUpdatingPrivacy\}/);
  const stylesSection = eventDetailsSource.slice(eventDetailsSource.indexOf("const styles = StyleSheet.create({"));
  assert.match(stylesSection, /privacyPill: \{[^}]*backgroundColor: "rgba\(255,255,255,0\.15\)"/s);
  assert.match(stylesSection, /privacyPillText: \{[^}]*color: "#FFFFFF"/s);
});

test("Publish flow (handlePublishDraft/buildPublishPayloadFromEvent) is untouched — publish still forwards event.privacy as-is", () => {
  const publishPayloadSection = eventDetailsSource.slice(
    eventDetailsSource.indexOf("const buildPublishPayloadFromEvent"),
    eventDetailsSource.indexOf("const getDistanceLabel"),
  );
  assert.match(publishPayloadSection, /privacy: event\.privacy,/);
});
