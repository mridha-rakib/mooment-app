import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the QR/Ticket scanner top-button visibility fix. Root cause: the
// back button and the flash button's inactive state were hard-coded to
// color="#FFFFFF" while CinematicButton renders a near-white blurred
// surface (rgba(255,255,255,0.8)) in light mode — a white icon on a
// near-white button was effectively invisible. Dark mode was unaffected
// (CinematicButton's dark surface is #1e1d21, where white already
// contrasts fine), so the fix swaps the hard-coded white for the existing
// colors.text theme token (black in light mode, white in dark mode —
// identical to the prior hard-coded value), leaving dark mode's approved
// appearance byte-for-byte unchanged.
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const scannerSource = readFileSync(
  join(process.cwd(), "app/event-screen/scan-qr.tsx"),
  "utf8",
);

test("back button icon is theme-aware instead of hard-coded white", () => {
  assert.doesNotMatch(
    scannerSource,
    /icon=\{ArrowLeft01Icon\}\s*\n\s*size=\{22\}\s*\n\s*color="#FFFFFF"/,
  );
  assert.match(
    scannerSource,
    /icon=\{ArrowLeft01Icon\}\s*\n\s*size=\{22\}\s*\n\s*color=\{colors\.text\}/,
  );
});

test("flash button's inactive state is theme-aware instead of hard-coded white", () => {
  assert.doesNotMatch(scannerSource, /color=\{flash \? '#F59E0B' : '#FFFFFF'\}/);
  assert.match(scannerSource, /color=\{flash \? '#F59E0B' : colors\.text\}/);
});

test("flash button's active (torch on) color is unchanged — active state not redesigned", () => {
  assert.match(scannerSource, /color=\{flash \? '#F59E0B' : colors\.text\}/);
});

test("torch state logic and toggle handler are untouched", () => {
  assert.match(scannerSource, /const \[flash, setFlash\] = useState\(false\);/);
  assert.match(scannerSource, /onPress=\{\(\) => setFlash\(f => !f\)\}/);
  assert.match(scannerSource, /enableTorch=\{flash\}/);
});

test("back navigation handler is untouched", () => {
  assert.match(scannerSource, /onPress=\{\(\) => safeBack\(router\)\}/);
});

test("header button geometry (size, icon size) is untouched", () => {
  assert.match(scannerSource, /icon=\{ArrowLeft01Icon\}\s*\n\s*size=\{22\}/);
  assert.match(scannerSource, /icon=\{flash \? FlashIcon : FlashOffIcon\}\s*\n\s*size=\{20\}/);
});

test("scanner frame, camera, and QR barcode logic are untouched", () => {
  assert.match(scannerSource, /barcodeScannerSettings=\{\{ barcodeTypes: \['qr'\] \}\}/);
  assert.match(scannerSource, /const FRAME = width \* 0\.65;/);
  assert.match(scannerSource, /facing="back"/);
});

test("manual ticket entry is untouched", () => {
  assert.match(scannerSource, /Enter Ticket No manually/);
  assert.match(scannerSource, /const handleManualCheckIn = \(\) => \{/);
});
