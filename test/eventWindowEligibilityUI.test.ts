import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the "Mooments" → "Window" tab rename and the new
// postingEligibility / participantPostVisibility window fields, at the
// source level — this repo has no React Native component test harness, so
// these assert against the actual wiring in the source files rather than
// rendered output (matching the existing convention in
// videoUploadDisabled.test.ts).

const eventScreenSource = readFileSync(join(process.cwd(), "app/event-screen/event.tsx"), "utf8");
const hostWindowsSource = readFileSync(join(process.cwd(), "components/eventTabs/HostEventWindowsTab.tsx"), "utf8");
const attendeeWindowsSource = readFileSync(join(process.cwd(), "components/eventTabs/AttendeeEventWindowsTab.tsx"), "utf8");
const eventWindowsLibSource = readFileSync(join(process.cwd(), "lib/eventWindows.ts"), "utf8");

// ============================================================
// 1 & 2 — tab rename
// ============================================================

test("Event Details tab label is \"Scene\", not \"Mooments\"", () => {
  assert.match(eventScreenSource, /const EVENT_WINDOW_TAB = "Scene";/);
  assert.doesNotMatch(eventScreenSource, /"Mooments"/);
});

test("every activeTab comparison for the windows tab uses the shared EVENT_WINDOW_TAB constant, not a repeated string literal", () => {
  const tabArrayMatches = eventScreenSource.match(/\["About", "Access", EVENT_WINDOW_TAB, "Chat"\]/g) ?? [];
  const activeTabComparisons = eventScreenSource.match(/activeTab === EVENT_WINDOW_TAB/g) ?? [];

  assert.equal(tabArrayMatches.length, 1);
  // Two comparisons: the pull-to-refresh dispatch and the tab-content switch.
  assert.equal(activeTabComparisons.length, 2);
});

// ============================================================
// 3 & 4 — host create form UI
// ============================================================

test("host create-window form offers \"Who can post?\" with Ticket holders / Checked-in attendees", () => {
  assert.match(hostWindowsSource, /WHO CAN POST\?/);
  assert.match(hostWindowsSource, /title: "Ticket holders"/);
  assert.match(hostWindowsSource, /title: "Checked-in attendees"/);
  assert.match(hostWindowsSource, /EVENT_WINDOW_POSTING_ELIGIBILITIES\.map/);
});

test("host create-window form offers \"When can participants view posts?\" with Instant / End of event", () => {
  assert.match(hostWindowsSource, /WHEN CAN PARTICIPANTS VIEW POSTS\?/);
  assert.match(hostWindowsSource, /title: "Instant"/);
  assert.match(hostWindowsSource, /title: "End of event"/);
  assert.match(hostWindowsSource, /EVENT_WINDOW_PARTICIPANT_POST_VISIBILITIES\.map/);
});

test("editing an existing window shows the configured policy read-only, not as editable radio options", () => {
  assert.match(hostWindowsSource, /editingWindow \? \(\s*<View style=\{\[styles\.policyReadout/);
  assert.match(hostWindowsSource, /cannot be changed afterward/);
});

// ============================================================
// 5 & 6 — defaults and create payload
// ============================================================

test("a brand-new window defaults to checked_in_attendees + end_of_event (backward-compatible defaults)", () => {
  const initialFormFn = (() => {
    const start = hostWindowsSource.indexOf("const createInitialForm = (");
    const end = hostWindowsSource.indexOf("const formatDate", start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    return hostWindowsSource.slice(start, end);
  })();

  assert.match(initialFormFn, /postingEligibility: "checked_in_attendees"/);
  assert.match(initialFormFn, /participantPostVisibility: "end_of_event"/);
});

test("create request sends both postingEligibility and participantPostVisibility; edit requests never do", () => {
  const saveWindowStart = hostWindowsSource.indexOf("const saveWindow = async () => {");
  const saveWindowEnd = hostWindowsSource.indexOf("const confirmCancel", saveWindowStart);
  const saveWindowFn = hostWindowsSource.slice(saveWindowStart, saveWindowEnd);

  assert.match(saveWindowFn, /await createEventWindow\(eventId, \{\s*\.\.\.editableFields,\s*postingEligibility: form\.postingEligibility,\s*participantPostVisibility: form\.participantPostVisibility,/);
  // The edit branches only ever pass a subset of editableFields — neither
  // policy field is ever included in an updateEventWindow call.
  const updateCalls = saveWindowFn.match(/updateEventWindow\(eventId, editingWindow\.id, [^)]*\)/gs) ?? [];
  assert.ok(updateCalls.length > 0, "expected at least one updateEventWindow call");
  for (const call of updateCalls) {
    assert.doesNotMatch(call, /postingEligibility/);
    assert.doesNotMatch(call, /participantPostVisibility/);
  }
});

test("backend rejects postingEligibility/participantPostVisibility on PATCH — UpdateEventWindowPayload type omits them", () => {
  assert.match(eventWindowsLibSource, /export type UpdateEventWindowPayload = Partial<Omit<EventWindowPayload, "postingEligibility" \| "participantPostVisibility">>;/);
});

// ============================================================
// 7 & 8 — attendee eligibility messaging
// ============================================================

test("attendee UI gates posting on isEligibleToPost (server-computed), not on hasAttended alone", () => {
  const openPostFormStart = attendeeWindowsSource.indexOf("const openPostForm = (window: EventWindow) => {");
  const openPostFormEnd = attendeeWindowsSource.indexOf("const selectType", openPostFormStart);
  const openPostFormFn = attendeeWindowsSource.slice(openPostFormStart, openPostFormEnd);

  assert.match(openPostFormFn, /if \(!window\.isEligibleToPost\) \{/);
});

test("ticket_holders mode shows a ticket-required message, not a check-in message, when ineligible", () => {
  assert.match(attendeeWindowsSource, /window\.postingEligibility === "ticket_holders" \? "Ticket required" : "Check-in required"/);
  assert.match(attendeeWindowsSource, /You need a valid ticket for this event to post in this scene\./);
});

test("checked_in_attendees mode still shows the check-in-required message when ineligible", () => {
  assert.match(attendeeWindowsSource, /Check in at event to unlock posting\./);
});

// ============================================================
// 9 & 10 — gallery visibility driven entirely by server response
// ============================================================

test("gallery availability (loadGallery, toggleGallery, canOpenGallery) is driven only by window.canViewPosts from the server — no local eventEnded recomputation", () => {
  assert.doesNotMatch(attendeeWindowsSource, /eventEnded/);
  assert.match(attendeeWindowsSource, /const canOpenGallery = window\.canViewPosts;/);

  const loadGalleryStart = attendeeWindowsSource.indexOf("const loadGallery = useCallback(");
  const loadGalleryEnd = attendeeWindowsSource.indexOf("const toggleGallery", loadGalleryStart);
  const loadGalleryFn = attendeeWindowsSource.slice(loadGalleryStart, loadGalleryEnd);
  assert.match(loadGalleryFn, /if \(!window\.canViewPosts\) return;/);
});

test("getWindowMessage distinguishes instant unlock from end-of-event lock purely from server-provided canViewPosts", () => {
  const messageFnStart = attendeeWindowsSource.indexOf("const getWindowMessage = (window: EventWindow) => {");
  const messageFnEnd = attendeeWindowsSource.indexOf("const POSTING_ELIGIBILITY_SUMMARY", messageFnStart);
  const messageFn = attendeeWindowsSource.slice(messageFnStart, messageFnEnd);

  assert.match(messageFn, /window\.canViewPosts \? "Private gallery unlocked\." : "Post submitted\. Gallery unlocks after the event ends\."/);
});
