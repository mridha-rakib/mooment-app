import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
const eventDetail = read("app/event-screen/event.tsx");
const successToast = read("components/ui/SuccessToast.tsx");
const publishHandler = eventDetail.match(/const handlePublishDraft = async \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
const publishFooter = eventDetail.slice(
  eventDetail.indexOf("{isDraftPreview ? ("),
  eventDetail.indexOf(") : isHostMode ? (", eventDetail.indexOf("{isDraftPreview ? (")),
);

test("EVT-018: the existing publishing guard, disabled action, spinner, and text remain wired", () => {
  assert.match(publishHandler, /if \(!event \|\| !isDraftPreview \|\| isPublishingDraft\)/);
  assert.match(publishHandler, /setIsPublishingDraft\(true\)/);
  assert.match(publishHandler, /finally \{\s*setIsPublishingDraft\(false\)/);
  assert.match(publishFooter, /disabled=\{isPublishingDraft\}/);
  assert.match(publishFooter, /<ActivityIndicator size="small" color="#111111" \/>/);
  assert.match(publishFooter, /isPublishingDraft \? "Publishing\.\.\." : "Publish Event"/);
});

test("EVT-018: the animated accessible Event published confirmation follows authoritative merge", () => {
  const responseIndex = publishHandler.indexOf("await publishSavedEventDraft(payload, event.id)");
  const mergeIndex = publishHandler.indexOf("mergeUpdatedEvent(updated)");
  const successIndex = publishHandler.indexOf('notifySuccess("Event published")');
  assert.ok(responseIndex > -1 && mergeIndex > responseIndex && successIndex > mergeIndex);
  assert.match(successToast, /Animated\.timing\(anim/);
  assert.match(successToast, /accessibilityRole="alert"/);
  assert.match(successToast, /AccessibilityInfo\.announceForAccessibility/);
});

test("EVT-018: publish success emits one primary confirmation and failure never emits it", () => {
  assert.equal((publishHandler.match(/notifySuccess\(/g) ?? []).length, 1);
  const catchBlock = publishHandler.match(/\} catch \(error\) \{[\s\S]*?\n    \} finally/)?.[0] ?? "";
  assert.match(catchBlock, /Alert\.alert\("Unable to publish event"/);
  assert.doesNotMatch(catchBlock, /notifySuccess\(/);
  assert.doesNotMatch(publishHandler, /getMyHostedEventsCount/);
});

test("EVT-018: success is transient and the published host branch replaces the draft footer", () => {
  assert.doesNotMatch(eventDetail, /isPublishSuccess|publishSuccessVisible|setPublishSuccess/);
  assert.match(eventDetail, /const isDraftPreview = Boolean\(event && event\.status === "draft" && isEventOwner\)/);
  assert.match(publishFooter, /\{isDraftPreview \? \(/);
  assert.match(eventDetail, /\) : isHostMode \? \(/);
  assert.match(eventDetail, /!isEventCompleted && !isEventCancelled && showHostLifecycleFooter/);
});

test("EVT-018: published authoritative privacy and ticket data remain server-sourced", () => {
  assert.match(publishHandler, /const payload = buildPublishPayloadFromEvent\(event\)/);
  assert.match(publishHandler, /mergeUpdatedEvent\(updated\)/);
  assert.match(eventDetail, /privacy: event\.privacy,/);
  assert.match(eventDetail, /tickets: event\.tickets\.map/);
});
