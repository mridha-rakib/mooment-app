import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const stepFive = readFileSync(join(process.cwd(), "app/create-event/step-5.tsx"), "utf8");
const eventDetail = readFileSync(join(process.cwd(), "app/event-screen/event.tsx"), "utf8");
const accessTab = readFileSync(join(process.cwd(), "components/eventTabs/AccessTab.tsx"), "utf8");

const previewEditSection = eventDetail.slice(
  eventDetail.indexOf("const handlePreviewEditStep"),
  eventDetail.indexOf("const handlePublishDraft"),
);
const accessTabInvocation = eventDetail.slice(
  eventDetail.indexOf("<AccessTab"),
  eventDetail.indexOf("{activeTab === EVENT_WINDOW_TAB"),
);
const sceneSection = eventDetail.slice(
  eventDetail.indexOf("{activeTab === EVENT_WINDOW_TAB"),
  eventDetail.indexOf("{activeTab === \"Chat\""),
);
const previewShellSection = eventDetail.slice(
  eventDetail.indexOf("{isDraftPreview ? ("),
  eventDetail.indexOf(") : isHostMode ? (", eventDetail.indexOf("{isDraftPreview ? (")),
);

test("Step 5 saves the draft then opens the shared Event Detail Preview route", () => {
  assert.match(stepFive, /await saveDraft\(\)/);
  assert.match(stepFive, /pathname: '\/event-screen\/event'/);
  assert.match(stepFive, /eventId: event\.id, mode: isEditingPublished \? 'host' : 'preview'/);
  assert.match(eventDetail, /getEventById\(eventId\)/);
});

test("Preview preserves shared Event Detail content and persisted ticket order", () => {
  for (const marker of ["bannerImageUri", "event?.categories", "hostName", "formatEventTimeDisplay", "event?.location", "getPrivacyLabel"]) {
    assert.match(eventDetail, new RegExp(marker.replace(/[?.]/g, "\\$&")));
  }
  assert.match(accessTab, /tickets\.map\(\(ticket, index\) =>/);
  assert.doesNotMatch(accessTab, /tickets\.sort\(/);
});

test("Preview uses attendee-like Access and Scene content, while published hosts keep management", () => {
  assert.match(accessTabInvocation, /isHostMode=\{!isDraftPreview && isHostMode\}/);
  assert.match(accessTabInvocation, /onCreateTicket=\{isDraftPreview \|\| isEventCompleted/);
  assert.match(accessTabInvocation, /onEditTicket=\{isDraftPreview \|\| isEventCompleted/);
  assert.match(accessTabInvocation, /onDeleteTicket=\{isDraftPreview \? undefined/);
  assert.match(accessTabInvocation, /onCreateReward=\{isDraftPreview \? undefined/);
  assert.match(accessTabInvocation, /onEditReward=\{isDraftPreview \? undefined/);
  assert.match(accessTabInvocation, /onDeleteReward=\{isDraftPreview \? undefined/);
  assert.match(sceneSection, /isEventOwner && !isDraftPreview \?/);
  assert.match(sceneSection, /<AttendeeEventWindowsTab/);
  assert.match(accessTabInvocation, /ticketStats=\{!isDraftPreview && isHostMode/);
});

test("Preview keeps explicit Edit and Publish shell controls", () => {
  assert.match(previewShellSection, /onPress=\{handleEdit\}/);
  assert.match(previewShellSection, /Publish Event/);
  assert.match(eventDetail, /const handlePublishDraft/);
});

test("targeted Preview edit hydrates the existing draft without reset and routes to every wizard step", () => {
  assert.match(previewEditSection, /loadEventForEdit\(event\)/);
  assert.doesNotMatch(previewEditSection, /resetDraft\(/);
  for (const route of ["/create-event", "/create-event/step-2", "/create-event/step-3", "/create-event/step-4", "/create-event/step-5"]) {
    assert.match(eventDetail, new RegExp(`\\[\\"Edit [^\\"]+\\", \\"${route.replaceAll("/", "\\/")}\\"\\]`));
  }
});

test("Preview keeps chat draft safety and does not present draft inventory as published availability", () => {
  assert.match(eventDetail, /isDraftPreviewDisabled=\{isDraftPreview\}/);
  assert.match(accessTab, /isDraftPreview = false/);
  assert.match(accessTab, /!isDraftPreview && <View style=\{\[/);
  assert.match(accessTab, /!isDraftPreview && \(\(!isLocked/);
});
