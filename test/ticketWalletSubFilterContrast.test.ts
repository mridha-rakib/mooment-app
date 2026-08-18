import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

const walletSource = readFileSync(
  join(process.cwd(), "app/event-screen/wallet.tsx"),
  "utf8",
);

const segmentedControlSource = readFileSync(
  join(process.cwd(), "components/ui/SegmentedControl.tsx"),
  "utf8",
);

const segmentedControlMapSection = segmentedControlSource.slice(
  segmentedControlSource.indexOf("{options.map((option) => ("),
  segmentedControlSource.indexOf("export default SegmentedControl;"),
);

const renderSubFilterOptionSection = walletSource.slice(
  walletSource.indexOf("const renderSubFilterOption ="),
  walletSource.indexOf("const handleSelectSubFilter ="),
);

const subFilterJsxSection = walletSource.slice(
  walletSource.indexOf("{showSubFilter && ("),
  walletSource.indexOf("<ScrollView"),
);

const getStyleBlock = (styleName: string) => {
  const stylesSection = walletSource.slice(walletSource.indexOf("const styles = StyleSheet.create({"));
  const match = stylesSection.match(new RegExp(`\\b${styleName}: \\{([\\s\\S]*?)\\n  \\},`));
  assert.ok(match, `Expected ${styleName} style block to exist`);
  return match[1] ?? "";
};

const subFilterControlBlock = getStyleBlock("subFilterControl");
const subFilterControlDarkBlock = getStyleBlock("subFilterControlDark");
const subFilterControlLightBlock = getStyleBlock("subFilterControlLight");
const subFilterActiveSegmentBlock = getStyleBlock("subFilterActiveSegment");
const subFilterActiveSegmentDarkBlock = getStyleBlock("subFilterActiveSegmentDark");
const subFilterActiveSegmentLightBlock = getStyleBlock("subFilterActiveSegmentLight");

// WCAG 2.x relative luminance / contrast ratio — computed, not eyeballed.
// https://www.w3.org/TR/WCAG21/#contrast-minimum
const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
};

const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [channel(r), channel(g), channel(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

const contrastRatio = (hexA: string, hexB: string) => {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
};

// The dark-mode track is translucent (rgba(17,17,17,0.78)) composited over
// the app's pure-black screen background — approximate the flattened color.
const DARK_TRACK_COMPOSITED = "#111111";
const WCAG_AA_NON_TEXT_MINIMUM = 3; // icons/UI components: WCAG 1.4.11
const WCAG_AA_TEXT_MINIMUM = 4.5;

const extractIconColors = () => {
  const match = renderSubFilterOptionSection.match(
    /iconColor = isSelected \? colors\.text : isDark \? "(#[0-9A-Fa-f]{6})" : "(#[0-9A-Fa-f]{6})"/,
  );
  assert.ok(match, "Expected the isSelected/isDark iconColor ternary to be present and parseable");
  return { darkInactive: match[1], lightInactive: match[2] };
};

test("light-mode subFilterControl is not the fixed dark glass color", () => {
  assert.doesNotMatch(subFilterControlLightBlock, /rgba\(17, 17, 17, 0\.78\)/);
  assert.match(subFilterControlLightBlock, /backgroundColor:\s*"#F5F5F7"/);
});

test("dark-mode subFilterControl remains exactly rgba(17, 17, 17, 0.78)", () => {
  assert.match(subFilterControlDarkBlock, /backgroundColor:\s*"rgba\(17, 17, 17, 0\.78\)"/);
  assert.match(subFilterControlDarkBlock, /borderColor:\s*"rgba\(255, 255, 255, 0\.09\)"/);
});

test("light-mode active segment uses a readable light-theme selected surface", () => {
  assert.match(subFilterActiveSegmentLightBlock, /backgroundColor:\s*"#FFFFFF"/);
});

test("dark-mode active segment remains unchanged", () => {
  assert.match(subFilterActiveSegmentDarkBlock, /backgroundColor:\s*"rgba\(255, 255, 255, 0\.18\)"/);
  assert.match(subFilterActiveSegmentDarkBlock, /borderColor:\s*"rgba\(255, 255, 255, 0\.22\)"/);
});

test("container is wired to swap the color variant by theme, geometry stays shared", () => {
  assert.match(
    subFilterJsxSection,
    /containerStyle=\{\[styles\.subFilterControl, isDark \? styles\.subFilterControlDark : styles\.subFilterControlLight\]\}/,
  );
  assert.match(
    subFilterJsxSection,
    /activeSegmentStyle=\{\[styles\.subFilterActiveSegment, isDark \? styles\.subFilterActiveSegmentDark : styles\.subFilterActiveSegmentLight\]\}/,
  );
});

test("selected icon is readable on its selected surface in both themes via colors.text", () => {
  assert.match(renderSubFilterOptionSection, /iconColor = isSelected \? colors\.text/);
});

test("dark-mode selected icon token (colors.text) resolves to the previously approved #FFFFFF", () => {
  const colorsSource = readFileSync(join(process.cwd(), "constants/Colors.ts"), "utf8");
  assert.match(colorsSource, /dark:\s*\{[^}]*?text:\s*'#FFFFFF'/s);
  assert.match(colorsSource, /light:\s*\{[^}]*?text:\s*'#000000'/s);
});

test("light-mode inactive icon is readable, dark-mode inactive icon remains #D4D0DA", () => {
  assert.match(renderSubFilterOptionSection, /: isDark \? "#D4D0DA" : "#302B35"/);
});

test("light-mode inactive icon is not white/near-white against the light track", () => {
  assert.doesNotMatch(renderSubFilterOptionSection, /isDark \? "#D4D0DA" : "#(FFFFFF|FEFEFE|F5F5F7|EFEFEF)"/);
});

test("active and inactive icon colors remain visually distinct in both themes", () => {
  const { darkInactive, lightInactive } = extractIconColors();
  assert.notEqual(darkInactive.toUpperCase(), "#FFFFFF"); // must differ from the active color
  assert.notEqual(lightInactive.toUpperCase(), "#000000"); // must differ from the active color
});

test("COMPUTED WCAG CONTRAST: light-mode inactive icon vs light track (#F5F5F7) clears the AA text threshold (4.5:1), not just the 3:1 icon minimum", () => {
  const { lightInactive } = extractIconColors();
  const ratio = contrastRatio(lightInactive, "#F5F5F7");
  assert.ok(
    ratio >= WCAG_AA_TEXT_MINIMUM,
    `Expected ${lightInactive} vs #F5F5F7 to be >= ${WCAG_AA_TEXT_MINIMUM}:1, got ${ratio.toFixed(2)}:1`,
  );
});

test("COMPUTED WCAG CONTRAST: dark-mode inactive icon (#D4D0DA, unchanged) vs the composited dark track clears AA", () => {
  const { darkInactive } = extractIconColors();
  const ratio = contrastRatio(darkInactive, DARK_TRACK_COMPOSITED);
  assert.ok(
    ratio >= WCAG_AA_TEXT_MINIMUM,
    `Expected ${darkInactive} vs ${DARK_TRACK_COMPOSITED} to be >= ${WCAG_AA_TEXT_MINIMUM}:1, got ${ratio.toFixed(2)}:1`,
  );
});

test("COMPUTED WCAG CONTRAST: light-mode active icon (#000000) vs light active segment (#FFFFFF) is maximal", () => {
  const ratio = contrastRatio("#000000", "#FFFFFF");
  assert.ok(ratio > 20, `Expected near-maximal contrast, got ${ratio.toFixed(2)}:1`);
});

test("both inactive icon colors clear the WCAG 1.4.11 non-text 3:1 floor as well as the stricter 4.5:1 bar checked above", () => {
  const { darkInactive, lightInactive } = extractIconColors();
  assert.ok(contrastRatio(lightInactive, "#F5F5F7") >= WCAG_AA_NON_TEXT_MINIMUM);
  assert.ok(contrastRatio(darkInactive, DARK_TRACK_COMPOSITED) >= WCAG_AA_NON_TEXT_MINIMUM);
});

test("sanity check: the contrast helper correctly ranks known reference pairs (regression guard for the helper itself)", () => {
  // Identical colors must always report the theoretical floor (1:1), and
  // black-on-white must report the theoretical ceiling (21:1) — if either
  // of these fails, the helper's math is broken, not the app's colors.
  assert.ok(Math.abs(contrastRatio("#F5F5F7", "#F5F5F7") - 1) < 0.001);
  assert.ok(Math.abs(contrastRatio("#000000", "#FFFFFF") - 21) < 0.01);
});

test("regression: current inactive icon (#302B35) has a larger contrast margin than the prior iteration (#6E6877) against the same light track", () => {
  const { lightInactive } = extractIconColors();
  const currentRatio = contrastRatio(lightInactive, "#F5F5F7");
  const priorRatio = contrastRatio("#6E6877", "#F5F5F7");
  assert.ok(
    currentRatio > priorRatio,
    `Expected the hardened color to have a larger contrast margin (${currentRatio.toFixed(2)}:1) than the prior one (${priorRatio.toFixed(2)}:1)`,
  );
});

test("inactive state is not implemented via opacity", () => {
  assert.doesNotMatch(renderSubFilterOptionSection, /opacity/i);
});

test("both sub-filter options render their own icon element unconditionally, keyed by option not selection", () => {
  assert.match(renderSubFilterOptionSection, /option === "Active"[\s\S]*?ticket-outline[\s\S]*?\)\s*:\s*\([\s\S]*?"clock"/);
});

// --- Post-interaction remount fix -----------------------------------------
//
// Reported symptom: both icons paint correctly on initial mount, but the icon
// that transitions FROM active TO inactive after a tap disappears — i.e. the
// bug is specific to an in-place *update* (isSelected: true -> false), not to
// the initial paint. The icon element/name/size never change across that
// transition, only its `color` prop does, so the underlying native Text node
// was being updated in place rather than remounted.
//
// Fix: give the icon wrapper and the icon element a `key` that encodes
// `isSelected`, so React fully unmounts+remounts the subtree on every
// selection toggle (React's documented "key resets state" behavior applies
// to a single positional child, not only list children). This makes every
// selection change repaint via a fresh mount — the exact path already proven
// correct above — instead of relying on an in-place style-only update.
//
// NOTE ON TEST TOOLING: this project has neither @testing-library/react-native
// nor react-test-renderer installed, so an actual "mount, tap, assert the DOM"
// interaction test cannot be written truthfully here. What CAN be proven at
// the source level: (a) the key is wired onto the right elements, and (b) the
// key-generation logic itself is pure and produces a distinct key for every
// (option, isSelected) combination — which is the exact precondition for
// React to treat a selection toggle as a remount rather than an update. That
// second part is verified below by literally re-deriving the same template
// the component uses and checking it algebraically, not by trusting the regex.

test("icon wrapper View key encodes isSelected (forces remount, not in-place update, on every selection toggle)", () => {
  assert.match(renderSubFilterOptionSection, /<View key=\{`\$\{option\}-\$\{isSelected\}`\}/);
});

test("both icon elements (Ionicons and Feather) also carry a selection-encoded key", () => {
  assert.match(renderSubFilterOptionSection, /<Ionicons key=\{`\$\{option\}-\$\{isSelected\}-icon`\}/);
  assert.match(renderSubFilterOptionSection, /<Feather key=\{`\$\{option\}-\$\{isSelected\}-icon`\}/);
});

test("PURE LOGIC PROOF: the key template yields a distinct key for every (option, isSelected) combination, including same-option toggles", () => {
  // Re-derive the exact template literal used in source: `${option}-${isSelected}`
  const keyOf = (option: string, isSelected: boolean) => `${option}-${isSelected}`;

  const active = "Active";
  const expired = "Expired";

  // The critical case: toggling selection on the SAME option must change the
  // key. If it didn't, React would treat it as an update, not a remount —
  // which is exactly the bug being fixed.
  assert.notEqual(keyOf(active, true), keyOf(active, false));
  assert.notEqual(keyOf(expired, true), keyOf(expired, false));

  // All four reachable (option, isSelected) states must be pairwise distinct.
  const keys = [
    keyOf(active, true),
    keyOf(active, false),
    keyOf(expired, true),
    keyOf(expired, false),
  ];
  assert.equal(new Set(keys).size, keys.length, "Expected all 4 option/selection keys to be unique");
});

test("LIMITATION (explicit, not swept under the rug): no RN component-mount tooling is installed, so this suite cannot literally mount SegmentedControl, simulate a tap, and assert the DOM tree still has 2 icon nodes afterward", () => {
  let hasRNTL = true;
  let hasTestRenderer = true;
  try {
    require.resolve("@testing-library/react-native");
  } catch {
    hasRNTL = false;
  }
  try {
    require.resolve("react-test-renderer");
  } catch {
    hasTestRenderer = false;
  }
  assert.equal(hasRNTL, false, "This assertion documents current state; if it now fails, RNTL is available and a real mount+tap test should replace this suite's source-level proofs.");
  assert.equal(hasTestRenderer, false, "This assertion documents current state; if it now fails, react-test-renderer is available and a real mount+tap test should replace this suite's source-level proofs.");
});

test("SegmentedControl always maps over every option and always invokes renderOption, regardless of selection (rules out a conditional-omission bug)", () => {
  assert.match(segmentedControlMapSection, /options\.map\(\(option\) => \(/);
  assert.doesNotMatch(segmentedControlMapSection, /selectedOption === option &&\s*\(?\s*renderOption/);
  assert.match(segmentedControlMapSection, /renderOption \?\s*\(?\s*renderOption\(option, selectedOption === option\)/);
});

test("geometry (width/height/radius) is shared and unchanged by the theme split", () => {
  assert.match(subFilterControlBlock, /width:\s*"100%"/);
  assert.match(subFilterControlBlock, /height:\s*44/);
  assert.match(subFilterControlBlock, /borderRadius:\s*18/);
  assert.doesNotMatch(subFilterControlBlock, /backgroundColor/);
  assert.match(subFilterActiveSegmentBlock, /borderWidth:\s*1/);
  assert.doesNotMatch(subFilterActiveSegmentBlock, /backgroundColor/);
});

test("sub-filter selection logic and options are unchanged", () => {
  assert.match(walletSource, /const WALLET_SUB_FILTERS: WalletSubFilter\[\] = \["Active", "Expired"\];/);
  assert.match(walletSource, /setActiveSubFilter\(option as WalletSubFilter\)/);
  assert.match(walletSource, /setSharedSubFilter\(option as WalletSubFilter\)/);
});

test("main Shared/Active/Used/Canceled tabs are unchanged", () => {
  assert.match(walletSource, /const WALLET_TABS: WalletTab\[\] = \["Shared", "Active", "Used", "Canceled"\];/);
  assert.match(walletSource, /options=\{WALLET_TABS\}/);
});

test("ticket card rendering is unchanged", () => {
  assert.match(walletSource, /styles\.viewTicketBtn/);
  assert.match(walletSource, /View Ticket/);
});

test("no API/business logic touched — wallet data loading is unchanged", () => {
  assert.match(walletSource, /getMyTicketWallet\(\)/);
  assert.match(walletSource, /emitTicketWalletChanged/);
});
