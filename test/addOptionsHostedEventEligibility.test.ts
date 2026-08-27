import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const readSource = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const addOptionsSource = readSource(join(process.cwd(), "components/modals/AddOptionsModal.tsx"));
const eligibilityStoreSource = readSource(join(process.cwd(), "stores/hostedEventEligibilityStore.ts"));
const tabLayoutSource = readSource(join(process.cwd(), "app/(tabs)/_layout.tsx"));
const profileSource = readSource(join(process.cwd(), "app/(tabs)/profile.tsx"));
const draftStoreSource = readSource(join(process.cwd(), "stores/eventDraftStore.ts"));
const eventScreenSource = readSource(join(process.cwd(), "app/event-screen/event.tsx"));
const eventFeedCardSource = readSource(join(process.cwd(), "components/home/EventFeedCard.tsx"));

const labelsInOrder = (source: string) =>
  ["New Post", "New Event", "Scan QR"].map((label) => source.indexOf(`label: "${label}"`));

test("eligibility state can distinguish unresolved, eligible, and ineligible", () => {
  assert.match(eligibilityStoreSource, /HostedEventEligibilityStatus = "unknown" \| "eligible" \| "ineligible"/);
  assert.match(eligibilityStoreSource, /hasActiveHostedEvent: boolean \| null/);
  assert.match(eligibilityStoreSource, /eligibilityStatus: "unknown"/);
  assert.match(eligibilityStoreSource, /hasActiveHostedEvent: null/);
});

test("shared eligibility derives only from the existing profile active group", () => {
  assert.match(eligibilityStoreSource, /deriveHostedEventEligibilityFromProfileEvents/);
  assert.match(eligibilityStoreSource, /profileEvents\.active\.length > 0/);
  assert.doesNotMatch(eligibilityStoreSource, /status === "published"|status === "live"/);
});

test("unresolved and resolved false omit Scan QR while keeping base options", () => {
  assert.match(addOptionsSource, /const BASE_OPTIONS = \[/);
  assert.match(addOptionsSource, /label: "New Post"/);
  assert.match(addOptionsSource, /label: "New Event"/);
  assert.match(addOptionsSource, /hasActiveHostedEvent === true \? \[SCAN_QR_OPTION\] : \[\]/);
  assert.doesNotMatch(addOptionsSource, /hasActiveHostedEvent !== false/);
});

test("resolved true appends Scan QR as the third option with the existing scanner route", () => {
  const [newPostIndex, newEventIndex, scanQrIndex] = labelsInOrder(addOptionsSource);
  assert.ok(newPostIndex >= 0);
  assert.ok(newEventIndex > newPostIndex);
  assert.ok(scanQrIndex > newEventIndex);
  assert.match(addOptionsSource, /route: "\/event-screen\/scan-qr"/);
  assert.match(addOptionsSource, /visibleOptions\.map/);
});

test("modal opening never fetches hosted events or gates opening on the network", () => {
  assert.doesNotMatch(addOptionsSource, /getMyProfileEvents/);
  assert.doesNotMatch(addOptionsSource, /refreshHostedEventEligibility|getState\(\)\.refresh|\.refresh\(\)/);
  assert.match(tabLayoutSource, /setIsAddModalVisible\(true\)/);
  assert.doesNotMatch(tabLayoutSource, /await refreshHostedEventEligibility|await useHostedEventEligibilityStore/);
});

test("New Post and New Event handlers remain routed through the existing option handler", () => {
  assert.match(addOptionsSource, /route: "\/post-screen\/create-post"/);
  assert.match(addOptionsSource, /route: "\/create-event"/);
  assert.match(addOptionsSource, /if \(optionId === "event"\)/);
  assert.match(addOptionsSource, /startCreateSession\(\);\s*router\.push\(route as any\);/);
});

test("no placeholder row, fixed sheet height, or reserved Scan QR space was added", () => {
  assert.doesNotMatch(addOptionsSource, /placeholder|invisible|opacity:\s*0|height:\s*3\d\d|minHeight:\s*3\d\d/);
  assert.match(addOptionsSource, /styles\.sheet/);
  assert.match(addOptionsSource, /paddingBottom: Math\.max\(insets\.bottom, 16\) \+ 12/);
});

test("eligibility refresh is preloaded from authenticated tab lifecycle and app foreground", () => {
  assert.match(tabLayoutSource, /refreshHostedEventEligibility\(\)\.catch\(\(\) => undefined\)/);
  assert.match(tabLayoutSource, /AppState\.addEventListener\("change"/);
  assert.match(tabLayoutSource, /nextState === "active"/);
  assert.match(tabLayoutSource, /resetHostedEventEligibility\(\)/);
});

test("own profile active-event fetch updates the shared eligibility without a duplicate API call", () => {
  assert.match(profileSource, /getProfileEvents\(userId, \{ filter: "active"/);
  assert.match(profileSource, /setHostedEventEligibilityFromProfileEvents\(\{ active: activeEvents\.active \}\)/);
});

test("publish and edit success refresh hosted-event eligibility", () => {
  assert.match(draftStoreSource, /event = await publishEvent\(publishedPayload, state\.draftId\)/);
  assert.match(draftStoreSource, /await refreshHostedEventEligibility\(\);/);
  assert.match(draftStoreSource, /if \(state\.isEditingPublishedEvent\) \{\s*await refreshHostedEventEligibility\(\);/);
});

test("draft preview publish and cancellation paths refresh hosted-event eligibility", () => {
  assert.match(eventScreenSource, /const updated = await publishSavedEventDraft\(payload, event\.id\);[\s\S]*?await refreshHostedEventEligibility\(\);/);
  assert.match(eventScreenSource, /const updated = await cancelEvent\(event\.id, payload\);[\s\S]*?await refreshHostedEventEligibility\(\);/);
  assert.match(eventFeedCardSource, /await cancelEvent\(event\.id, payload\);[\s\S]*?await refreshHostedEventEligibility\(\);/);
});

test("owner-only semantics are preserved by using /events/mine/profile, not feed or attended events", () => {
  assert.match(eligibilityStoreSource, /getMyProfileEvents\(\)/);
  assert.doesNotMatch(eligibilityStoreSource, /getFeedEvents|getMyJoinedEvents|getMyTicketWalletEvents|getMapEvents/);
});

test("profile active group covers upcoming/live and excludes completed, cancelled, and past-by-time cases", () => {
  assert.match(eligibilityStoreSource, /profileEvents\.active\.length > 0/);
  assert.match(eligibilityStoreSource, /getMyProfileEvents\(\)/);
  assert.doesNotMatch(addOptionsSource, /status === "published"|status === "live"|endAt|scheduledAt/);
});
