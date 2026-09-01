const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

const productTabSource = read("components/eventTabs/ProductTab.tsx");
const legalSource = read("components/profile/LegalDocumentScreen.tsx");
const withdrawSource = read("app/profile-screen/withdraw.tsx");
const preferenceSource = read("redux/slice/preference.ts");
const useThemeSource = read("hooks/useTheme.ts");
const settingsSource = read("app/profile-screen/settings.tsx");

test("Product menu no longer exposes fake report or save console actions", () => {
  assert.doesNotMatch(productTabSource, /console\.log\("Report product"\)/);
  assert.doesNotMatch(productTabSource, /console\.log\("Save product"\)/);
  assert.doesNotMatch(productTabSource, /onReport=\{/);
  assert.doesNotMatch(productTabSource, /onSave=\{/);
});

test("Legal documents reuse the same load function for initial fetch and Retry", () => {
  assert.match(legalSource, /const loadDocument = useCallback\(async/);
  assert.match(legalSource, /void loadDocument\(\(\) => isMounted\)/);
  assert.match(legalSource, /onPress=\{\(\) => \{\s*void loadDocument\(\);/s);
  assert.match(legalSource, />Retry<\/Text>/);
});

test("Legal documents show an empty state when no clause content is available", () => {
  assert.match(legalSource, /const clauses = document\?\.clauses \?\? \[\];/);
  assert.match(legalSource, /const hasDocumentContent = clauses\.some/);
  assert.match(legalSource, /Content unavailable/);
});

test("Withdrawal fee copy is neutral because no authoritative payout fee is exposed", () => {
  assert.doesNotMatch(withdrawSource, />None<\/Text>/);
  assert.match(withdrawSource, />May apply<\/Text>/);
  assert.doesNotMatch(withdrawSource, /processingFee|payoutFee|feeAmount/);
});

test("Theme system mode support remains unchanged, with Settings still using the existing binary switch", () => {
  assert.match(preferenceSource, /export type ThemeMode = 'light' \| 'dark' \| 'system';/);
  assert.match(useThemeSource, /themeSetting === 'system'/);
  assert.match(settingsSource, /label="Dark Mode"/);
  assert.match(settingsSource, /const nextTheme = nextValue \? 'dark' : 'light';/);
  assert.doesNotMatch(settingsSource, /System Mode|Use System|Appearance/);
});
