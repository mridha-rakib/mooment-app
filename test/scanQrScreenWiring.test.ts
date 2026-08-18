import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Follows the same source-string testing convention as
// test/feedVideoProcessingSync.test.ts and test/mapMarkerLivePulseAndFocusRefresh.test.ts:
// this repo has no component-rendering test library installed, so wiring that
// can't be unit-tested in isolation (React effects, navigation focus, camera)
// is verified against the exact scan-qr.tsx / AddOptionsModal.tsx source text.
//
// Manual Check-In no longer requires a selected event (see scan-qr audit +
// implementation): the ticket code alone determines its event server-side, so
// the per-screen hosted-events fetch/snapshot/chip-selector was removed
// entirely from this screen. AddOptionsModal's own active-hosted-event
// pre-check is kept, because it independently gates whether "Scan QR" is
// reachable at all (for a user hosting zero active events) -- that gate is
// unrelated to the removed manual event selector, so it stays.
const readSourceNormalized = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const scanQrSource = readSourceNormalized(join(process.cwd(), "app/event-screen/scan-qr.tsx"));
const addOptionsModalSource = readSourceNormalized(
  join(process.cwd(), "components/modals/AddOptionsModal.tsx"),
);

const sliceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `expected to find "${start}"`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `expected to find "${end}" after "${start}"`);
  return source.slice(startIndex, endIndex);
};

const handleOptionSource = sliceBetween(
  addOptionsModalSource,
  "const handleOption = async",
  "const dragResponder",
);
const manualPanelSource = sliceBetween(scanQrSource, "const manualPanel = (", "if (!permission)");

// ── AddOptionsModal still gates "Scan QR" on active hosted events ──────────
// (independent of the manual event selector, which lived inside scan-qr.tsx)

test("AddOptionsModal still performs its existing active-hosted-event pre-check before navigating", () => {
  assert.match(handleOptionSource, /const profileEvents = await getMyProfileEvents\(\);/);
  assert.match(handleOptionSource, /if \(profileEvents\.active\.length === 0\)/);
});

test("no active events still returns without navigating and without redesigning the modal", () => {
  const preCheckSource = sliceBetween(handleOptionSource, 'if (optionId === "scan")', 'if (optionId === "event")');
  assert.match(
    preCheckSource,
    /if \(profileEvents\.active\.length === 0\) \{\s*optionPressLockRef\.current = false;\s*setOptionsEnabled\(true\);\s*return;\s*\}/,
  );
});

test("the now-dead scanner hosted-events handoff was removed from AddOptionsModal", () => {
  assert.doesNotMatch(addOptionsModalSource, /setPendingScannerHostedEvents/);
  assert.doesNotMatch(addOptionsModalSource, /toScannerHostedEvents/);
  assert.doesNotMatch(addOptionsModalSource, /scanQrHostedEvents/);
});

// ── The scanner screen no longer fetches/holds a hosted-events snapshot ────

test("scan-qr.tsx no longer imports or references the removed scanQrHostedEvents module", () => {
  assert.doesNotMatch(scanQrSource, /scanQrHostedEvents/);
  assert.doesNotMatch(scanQrSource, /hostEventsSnapshot/);
  assert.doesNotMatch(scanQrSource, /selectedEventId/);
  assert.doesNotMatch(scanQrSource, /getMyProfileEvents/);
});

test("scan-qr.tsx no longer fetches hosted events on mount, focus, or retry", () => {
  assert.doesNotMatch(scanQrSource, /fetchHostedEvents/);
  assert.doesNotMatch(scanQrSource, /useFocusEffect/);
  assert.doesNotMatch(scanQrSource, /handleRetryHostedEvents/);
});

// ── Manual panel: no event selector, chip list, loading, or error UI ───────

test("the manual panel no longer renders an event selector, chip list, or hosted-events loading/error UI", () => {
  assert.doesNotMatch(manualPanelSource, /eventChip/);
  assert.doesNotMatch(manualPanelSource, /hostEvents/);
  assert.doesNotMatch(manualPanelSource, /Couldn&apos;t load your hosted events\./);
  assert.doesNotMatch(manualPanelSource, /No active hosted event is available\./);
});

test("the manual panel is just the heading and the ticket-number input row", () => {
  assert.match(manualPanelSource, /Manual Ticket No/);
  assert.match(manualPanelSource, /placeholder="MOM-26-X7K9-P4M2"/);
});

// ── Check-In enablement no longer depends on a selected event ──────────────

test("Check In is disabled only by an empty manual code or an active submission, never by event selection", () => {
  assert.match(
    scanQrSource,
    /disabled=\{!manualTicketNo\.trim\(\) \|\| isManualSubmitting\}/,
  );
  assert.doesNotMatch(scanQrSource, /!selectedEventId/);
});

// ── QR submission remains byte-for-byte unchanged ───────────────────────────

test("QR submission still calls checkInTicket with only the scanned data, gated by the existing scanner lock", () => {
  assert.match(
    scanQrSource,
    /onBarcodeScanned=\{isScanning \|\| isManualOpen \? undefined : \(\{ data \}\) => \{\s*void checkInTicket\(data\);\s*\}\}/,
  );
});

// ── Manual submission now sends the same code-only shape as QR ─────────────

test("manual submission still trims and uppercases the code, and now calls checkInTicket without a client-selected eventId", () => {
  assert.match(scanQrSource, /const checkInCode = manualTicketNo\.trim\(\)\.toUpperCase\(\);/);
  assert.match(scanQrSource, /if \(!checkInCode \|\| isManualSubmitting\) return;/);
  assert.match(scanQrSource, /void checkInTicket\(checkInCode, undefined, true\);/);
});

test("checkInTicket still posts through scanTicketQrCode with only (checkInCode, eventId), unchanged by the manual-flow change", () => {
  assert.match(scanQrSource, /const scannedTicket = await scanTicketQrCode\(checkInCode, eventId\);/);
});

test("the success and failure Alerts are byte-identical to the pre-fix implementation", () => {
  assert.match(scanQrSource, /'Check-in successful',\s*`\$\{scannedTicket\.ticketName\}\\n\$\{scannedTicket\.ticketNo\}\\nHolder: \$\{scannedTicket\.holderName\}`/);
  assert.match(scanQrSource, /'Check-in failed',\s*getAuthErrorMessage\(error, 'This ticket could not be accepted\.'\)/);
  assert.match(scanQrSource, /text: manual \? 'Done' : 'Scan next'/);
  assert.match(scanQrSource, /text: 'Try again'/);
});

// ── No polling, pull-to-refresh, or WebSocket mechanism ─────────────────────

test("no polling, pull-to-refresh, or WebSocket mechanism was introduced", () => {
  assert.doesNotMatch(scanQrSource, /setInterval|setTimeout/);
  assert.doesNotMatch(scanQrSource, /RefreshControl/);
  assert.doesNotMatch(scanQrSource, /WebSocket/);
});
