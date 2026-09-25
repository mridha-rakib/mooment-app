import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const mapScreenSource = readFileSync(
  join(process.cwd(), "components/ui/MapScreen.tsx"),
  "utf8",
);

test("dark-mode inactive chip surface and border are exactly unchanged", () => {
  assert.match(
    mapScreenSource,
    /categoryBtnInactive: \{\s*\n\s*backgroundColor: "rgba\(255,255,255,0\.06\)",\s*\n\s*borderColor: "rgba\(255,255,255,0\.12\)",\s*\n\s*borderWidth: 1,\s*\n\s*\},/,
  );
});

test("light-mode inactive chip gets its own dedicated near-white translucent surface style", () => {
  assert.match(
    mapScreenSource,
    /categoryBtnInactiveLight: \{\s*\n\s*backgroundColor: "rgba\(255,255,255,0\.85\)",\s*\n\s*borderColor: "rgba\(0,0,0,0\.08\)",\s*\n\s*borderWidth: 1,\s*\n\s*\},/,
  );
});

test("inactive chip surface selection branches on isDark, satellite/active untouched", () => {
  assert.match(
    mapScreenSource,
    /: isDark\s*\n\s*\? styles\.categoryBtnInactive\s*\n\s*: styles\.categoryBtnInactiveLight,/,
  );
});

test("inactive label color is not hardcoded white for light mode", () => {
  assert.match(
    mapScreenSource,
    /color: isActive\s*\n\s*\? "#FFFFFF"\s*\n\s*: isDark\s*\n\s*\? "rgba\(255,255,255,0\.65\)"\s*\n\s*: "rgba\(0,0,0,0\.72\)",/,
  );
});

test("dark-mode inactive label color is exactly the previously approved value", () => {
  assert.match(mapScreenSource, /"rgba\(255,255,255,0\.65\)"/);
});

test("light-mode inactive label uses a readable dark foreground, not a light/white one", () => {
  assert.match(mapScreenSource, /"rgba\(0,0,0,0\.72\)"/);
});

test("active chip styling (background/border/text) is untouched by the light-mode fix", () => {
  assert.match(
    mapScreenSource,
    /isActive\s*\n\s*\? \{\s*\n\s*backgroundColor: catColor,\s*\n\s*borderColor: catColor,\s*\n\s*borderWidth: 1,\s*\n\s*\}/,
  );
  assert.match(mapScreenSource, /const catColor = cat === "All" \? "#8E54E9" : getCategoryColor\(cat\);/);
});

test("category dots still use the semantic per-category color, unaffected by theme", () => {
  assert.match(
    mapScreenSource,
    /styles\.categoryDot,\s*\n\s*\{ backgroundColor: getCategoryColor\(cat\) \},/,
  );
});

test("selected-category / filtering wiring is untouched", () => {
  assert.match(
    mapScreenSource,
    /onPress=\{\(\) => onCategoryChange\?\.\(cat === "All" \? null : cat\)\}/,
  );
  assert.match(mapScreenSource, /const activeCategory = selectedCategory \?\? "All";/);
});

test("map base style constants are untouched by the chip fix", () => {
  assert.match(mapScreenSource, /APP_MAP_STYLE_URL_NO_TRAFFIC/);
  assert.match(mapScreenSource, /APP_MAP_STYLE_URL_LIGHT_NO_TRAFFIC/);
  assert.match(mapScreenSource, /SATELLITE_MAP_STYLE_URL/);
});

test("marker and live-marker source is untouched by the chip fix", () => {
  assert.match(mapScreenSource, /styles\.liveBadgeDot, \{ backgroundColor: colors\.danger \}/);
  assert.match(mapScreenSource, /styles\.imageWrapper,\s*\n\s*\{ borderColor: glowColor, backgroundColor: colors\.background \},/);
});
