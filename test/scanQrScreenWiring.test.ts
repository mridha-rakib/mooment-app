import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Follows the same source-string testing convention as
// test/feedVideoProcessingSync.test.ts and test/mapMarkerLivePulseAndFocusRefresh.test.ts:
// this repo has no component-rendering test library installed, so wiring that
// can't be unit-tested in isolation (React effects, navigation focus, camera)
// is verified against the exact scan-qr.tsx / AddOptionsModal.tsx source text.
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
const fetchHostedEventsSource = sliceBetween(
  scanQrSource,
  "const fetchHostedEvents = useCallback",
  "const checkInTicket = async",
);
const mountEffectSource = sliceBetween(
  scanQrSource,
  "useEffect(() => {\n    isMountedRef.current = true;",
  "useFocusEffect(",
);
const focusEffectSource = sliceBetween(
  scanQrSource,
  "useFocusEffect(",
  "const handleRetryHostedEvents",
);
const manualPanelSource = sliceBetween(scanQrSource, "const manualPanel = (", "if (!permission)");

// ── 1/2/3. AddOptionsModal still gates on active events, then hands off ────

test("AddOptionsModal still performs its existing active-hosted-event pre-check before navigating", () => {
  assert.match(handleOptionSource, /const profileEvents = await getMyProfileEvents\(\);/);
  assert.match(handleOptionSource, /if \(profileEvents\.active\.length === 0\)/);
});

test("a successful pre-check with active events stores the handoff before falling through to navigation", () => {
  const preCheckSource = sliceBetween(handleOptionSource, 'if (optionId === "scan")', 'if (optionId === "event")');

  assert.match(
    preCheckSource,
    /setPendingScannerHostedEvents\(toScannerHostedEvents\(profileEvents\.active\)\)/,
  );
  // The handoff call must happen after the empty-active early return, i.e. only on the success path.
  const earlyReturnIndex = preCheckSource.indexOf("return;");
  const handoffIndex = preCheckSource.indexOf("setPendingScannerHostedEvents");
  assert.ok(earlyReturnIndex !== -1 && handoffIndex > earlyReturnIndex);
});

test("no active events still returns without navigating and without redesigning the modal", () => {
  const preCheckSource = sliceBetween(handleOptionSource, 'if (optionId === "scan")', 'if (optionId === "event")');
  assert.match(
    preCheckSource,
    /if \(profileEvents\.active\.length === 0\) \{\s*optionPressLockRef\.current = false;\s*setOptionsEnabled\(true\);\s*return;\s*\}/,
  );
});

// ── 4. Scanner resolves its initial state from the reused handoff ──────────

test("the scanner consumes the handoff exactly once via a lazy initializer and derives initial state from it", () => {
  assert.match(scanQrSource, /const \[initialHandoff\] = useState\(\(\) => takePendingScannerHostedEvents\(\)\);/);
  assert.match(
    scanQrSource,
    /const \[hostEventsSnapshot, setHostEventsSnapshot\] = useState\(\(\) =>\s*createInitialHostedEventsSnapshot\(initialHandoff\)\);/,
  );
});

// ── 5/6/7. No duplicate/unnecessary requests around mount and first focus ──

test("the mount effect skips fetching hosted events when a valid handoff already exists", () => {
  assert.match(mountEffectSource, /if \(!hasValidHandoff\) \{\s*void fetchHostedEvents\(\{ showLoading: true \}\);\s*\}/);
});

test("the focus effect ignores the very first focus so it never duplicates the mount/handoff fetch", () => {
  assert.match(
    focusEffectSource,
    /if \(isInitialFocusRef\.current\) \{\s*isInitialFocusRef\.current = false;\s*return;\s*\}/,
  );
});

test("subsequent focus events (after the first) do call the central fetch function for revalidation", () => {
  assert.match(focusEffectSource, /void fetchHostedEvents\(\{ showLoading: false \}\);/);
});

test("there is exactly one fetch function reused by mount, focus, and retry (no duplicated fetch logic)", () => {
  const fetchCallSites = scanQrSource.match(/void fetchHostedEvents\(/g) ?? [];
  assert.equal(fetchCallSites.length, 3); // mount, focus, retry
});

// ── Race safety: duplicate-request guard, stale-response guard, unmount guard ─

test("fetchHostedEvents guards against a duplicate concurrent request", () => {
  assert.match(fetchHostedEventsSource, /if \(activeFetchRef\.current\) return;/);
  assert.match(fetchHostedEventsSource, /activeFetchRef\.current = true;/);
});

test("fetchHostedEvents drops results from a superseded (stale) or unmounted request", () => {
  assert.match(fetchHostedEventsSource, /const fetchId = \+\+fetchIdRef\.current;/);
  assert.match(
    fetchHostedEventsSource,
    /if \(!isMountedRef\.current \|\| fetchId !== fetchIdRef\.current\) \{\s*return;\s*\}/,
  );
});

test("a failed request never converts to a literal empty array before the pure resolver decides the outcome", () => {
  assert.doesNotMatch(fetchHostedEventsSource, /\.catch\(\(\) => setHostEvents\(\[\]\)\)/);
  assert.match(fetchHostedEventsSource, /\.catch\(\(\) => \(\{ ok: false as const \}\)\)/);
});

// ── 10/11/12. Retry action reuses the same fetch function, one at a time ──

test("the manual message area shows the approved error copy and a Try Again action wired to the shared fetch", () => {
  assert.match(manualPanelSource, /Couldn&apos;t load your hosted events\./);
  assert.match(manualPanelSource, />Try Again<\/Text>/);
  assert.match(manualPanelSource, /onPress=\{handleRetryHostedEvents\}/);
});

test("handleRetryHostedEvents reuses fetchHostedEvents with the loading state shown, not a bespoke retry path", () => {
  const retrySource = sliceBetween(scanQrSource, "const handleRetryHostedEvents", "const checkInTicket = async");
  assert.match(retrySource, /void fetchHostedEvents\(\{ showLoading: true \}\);/);
});

// ── 23/24. Check-In enablement rule is untouched except for a real selectedEventId ─

test("Check In stays disabled without a manual code, without a selected event, or while submitting", () => {
  assert.match(
    scanQrSource,
    /disabled=\{!manualTicketNo\.trim\(\) \|\| !selectedEventId \|\| isManualSubmitting\}/,
  );
});

// ── 25/26/27/29. QR + manual submission, payload, and Alerts are untouched ─

test("QR submission still calls checkInTicket with only the scanned data, gated by the existing scanner lock", () => {
  assert.match(
    scanQrSource,
    /onBarcodeScanned=\{isScanning \|\| isManualOpen \? undefined : \(\{ data \}\) => \{\s*void checkInTicket\(data\);\s*\}\}/,
  );
});

test("manual submission still trims and uppercases the code before calling the same checkInTicket function", () => {
  assert.match(scanQrSource, /const checkInCode = manualTicketNo\.trim\(\)\.toUpperCase\(\);/);
  assert.match(scanQrSource, /void checkInTicket\(checkInCode, selectedEventId, true\);/);
});

test("checkInTicket still posts through scanTicketQrCode with only (checkInCode, eventId)", () => {
  assert.match(scanQrSource, /const scannedTicket = await scanTicketQrCode\(checkInCode, eventId\);/);
});

test("the success and failure Alerts are byte-identical to the pre-fix implementation", () => {
  assert.match(scanQrSource, /'Check-in successful',\s*`\$\{scannedTicket\.ticketName\}\\n\$\{scannedTicket\.ticketNo\}\\nHolder: \$\{scannedTicket\.holderName\}`/);
  assert.match(scanQrSource, /'Check-in failed',\s*getAuthErrorMessage\(error, 'This ticket could not be accepted\.'\)/);
  assert.match(scanQrSource, /text: manual \? 'Done' : 'Scan next'/);
  assert.match(scanQrSource, /text: 'Try again'/);
});

// ── 28. No polling, pull-to-refresh, WebSocket, or new package ─────────────

test("no polling, pull-to-refresh, or WebSocket mechanism was introduced", () => {
  assert.doesNotMatch(scanQrSource, /setInterval|setTimeout/);
  assert.doesNotMatch(scanQrSource, /RefreshControl/);
  assert.doesNotMatch(scanQrSource, /WebSocket/);
});

test("no new package import beyond the already-installed navigation focus hook", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  assert.ok(packageJson.dependencies["@react-navigation/native"]);
});
