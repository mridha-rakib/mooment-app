import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const aboutSource = readFileSync(
  join(process.cwd(), "components/eventTabs/AboutTab.tsx"),
  "utf8",
);
const accessSource = readFileSync(
  join(process.cwd(), "components/eventTabs/AccessTab.tsx"),
  "utf8",
);
const eventDetailsSource = readFileSync(
  join(process.cwd(), "app/event-screen/event.tsx"),
  "utf8",
);

const aboutSegmentedControl = aboutSource.slice(
  aboutSource.indexOf("<SegmentedControl"),
  aboutSource.indexOf("<View style={styles.contentStack}>"),
);
const accessSegmentedControl = accessSource.slice(
  accessSource.indexOf("<SegmentedControl"),
  accessSource.indexOf("{accessSubTab ==="),
);

test("Event Details renders the runtime About and Access tab components", () => {
  assert.match(eventDetailsSource, /import AboutTab from "@\/components\/eventTabs\/AboutTab"/);
  assert.match(eventDetailsSource, /import AccessTab from "@\/components\/eventTabs\/AccessTab"/);
  assert.match(eventDetailsSource, /activeTab === "About" && \(\s*<AboutTab/);
  assert.match(eventDetailsSource, /activeTab === "Access" && \(\s*<AccessTab/);
});

test("About sub-tab reuses the Access flat segmented-control visual pattern", () => {
  assert.match(accessSegmentedControl, /flat=\{true\}/);
  assert.match(aboutSegmentedControl, /flat=\{true\}/);
  assert.match(accessSegmentedControl, /containerStyle=\{\{ marginTop: 10, marginBottom: 16 \}\}/);
  assert.match(aboutSegmentedControl, /containerStyle=\{\{ marginTop: 10, marginBottom: 16 \}\}/);
  assert.doesNotMatch(aboutSegmentedControl, /styles\.subTabContainer/);
  assert.doesNotMatch(aboutSegmentedControl, /styles\.subTabSegment/);
});

test("About sub-tab keeps its existing options, icons, state, and content split", () => {
  assert.match(aboutSegmentedControl, /options=\{\["Description", "Gallery"\]\}/);
  assert.match(aboutSegmentedControl, /selectedOption=\{subTab\}/);
  assert.match(aboutSegmentedControl, /onSelect=\{setSubTab\}/);
  assert.match(aboutSegmentedControl, /"document-text"/);
  assert.match(aboutSegmentedControl, /"document-text-outline"/);
  assert.match(aboutSegmentedControl, /"images"/);
  assert.match(aboutSegmentedControl, /"images-outline"/);
  assert.match(aboutSource, /subTab === "Description"/);
  assert.match(aboutSource, /renderGallery\(\)/);
});

test("About sub-tab icon colors now match Access selected and inactive colors", () => {
  assert.match(accessSegmentedControl, /color=\{isSelected \? colors\.text : colors\.textSecondary\}/);
  assert.match(aboutSegmentedControl, /color=\{isSelected \? colors\.text : colors\.textSecondary\}/);
});

test("About and Access sub-tab icons are theme-aware, not hardcoded white", () => {
  assert.doesNotMatch(aboutSegmentedControl, /color=\{isSelected \? "#FFFFFF"/);
  assert.doesNotMatch(accessSegmentedControl, /color=\{isSelected \? "#FFFFFF"/);
});
