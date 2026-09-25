import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const layoutSource = readFileSync(
  join(process.cwd(), "app/_layout.tsx"),
  "utf8",
);

const gateSection = layoutSource.slice(
  layoutSource.indexOf("function SystemNavigationBarGate()"),
  layoutSource.indexOf("function LocationSharingGate()"),
);
const rootLayoutSection = layoutSource.slice(layoutSource.indexOf("export default function RootLayout()"));

test("system nav bar gate resolves its style from the app's active theme, not a static value", () => {
  assert.match(gateSection, /const \{ isDark \} = useTheme\(\);/);
  assert.match(gateSection, /NavigationBar\.setStyle\(isDark \? "dark" : "light"\)/);
  assert.match(gateSection, /\}, \[isDark\]\);/);
});

test("system nav bar gate is Android-only and does not touch iOS", () => {
  assert.match(gateSection, /if \(Platform\.OS !== "android"\) \{\s*return;/);
});

test("system nav bar gate is mounted inside the Redux Provider so it can react to theme changes", () => {
  assert.match(rootLayoutSection, /<SystemNavigationBarGate \/>/);
  const providerIndex = rootLayoutSection.indexOf("<Provider store={store}>");
  const gateIndex = rootLayoutSection.indexOf("<SystemNavigationBarGate />");
  const closeProviderIndex = rootLayoutSection.indexOf("</Provider>");
  assert.ok(providerIndex !== -1 && gateIndex > providerIndex && gateIndex < closeProviderIndex);
});

test("RootLayout no longer sets a static, non-reactive navigation bar style", () => {
  assert.doesNotMatch(rootLayoutSection.slice(0, rootLayoutSection.indexOf("return (")), /NavigationBar\.setStyle/);
});

test("status bar handling is untouched by this fix (still app-wide auto style)", () => {
  assert.match(rootLayoutSection, /<StatusBar style="auto" \/>/);
});
