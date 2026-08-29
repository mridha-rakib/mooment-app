import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const mapScreenSource = readFileSync(
  join(process.cwd(), "components/ui/MapScreen.tsx"),
  "utf8",
);
const mapStylesSource = readFileSync(
  join(process.cwd(), "lib/mapStyles.ts"),
  "utf8",
);

test("dark map style constant is unchanged from the approved night style", () => {
  assert.match(
    mapStylesSource,
    /export const APP_MAP_STYLE_URL = "mapbox:\/\/styles\/mapbox\/traffic-night-v2";/,
  );
});

test("a light-mode counterpart style is exported from the same Mapbox style family", () => {
  assert.match(
    mapStylesSource,
    /export const APP_MAP_STYLE_URL_LIGHT = "mapbox:\/\/styles\/mapbox\/traffic-day-v2";/,
  );
});

test("non-traffic map style constants are exported for the home map surface", () => {
  assert.match(
    mapStylesSource,
    /export const APP_MAP_STYLE_URL_NO_TRAFFIC = "mapbox:\/\/styles\/mapbox\/dark-v11";/,
  );
  assert.match(
    mapStylesSource,
    /export const APP_MAP_STYLE_URL_LIGHT_NO_TRAFFIC = "mapbox:\/\/styles\/mapbox\/streets-v12";/,
  );
});

test("satellite style constant is unchanged and independent of theme", () => {
  assert.match(
    mapStylesSource,
    /export const SATELLITE_MAP_STYLE_URL = "mapbox:\/\/styles\/mapbox\/satellite-streets-v12";/,
  );
});

test("MapScreen resolves the base style from isDark, satellite mode taking precedence", () => {
  assert.match(
    mapScreenSource,
    /const currentMapStyle = isSatellite\s*\n\s*\? SATELLITE_MAP_STYLE_URL\s*\n\s*: isDark\s*\n\s*\? APP_MAP_STYLE_URL_NO_TRAFFIC\s*\n\s*: APP_MAP_STYLE_URL_LIGHT_NO_TRAFFIC;/,
  );
});

test("MapScreen destructures isDark from the existing useTheme hook (no new theme system)", () => {
  assert.match(mapScreenSource, /const \{ colors, isDark \} = useTheme\(\);/);
});

test("map shade overlay is not rendered above the Mapbox map", () => {
  assert.doesNotMatch(mapScreenSource, /\bmapShade\b/);
  assert.doesNotMatch(mapScreenSource, /StyleSheet\.absoluteFillObject/);
  assert.doesNotMatch(mapScreenSource, /rgba\(0,0,0,0\.48\)/);
});

test("style-loaded gate still keys off currentMapStyle, so theme switches re-arm marker rendering", () => {
  assert.match(
    mapScreenSource,
    /React\.useEffect\(\(\) => \{\s*\n\s*setIsStyleLoaded\(false\);\s*\n\s*isStyleLoadedRef\.current = false;\s*\n\s*\}, \[currentMapStyle\]\);/,
  );
});

test("marker, badge, and chip visual source is untouched by the theme fix", () => {
  assert.match(mapScreenSource, /styles\.liveBadgeDot, \{ backgroundColor: colors\.danger \}/);
  assert.match(mapScreenSource, /styles\.imageWrapper,\s*\n\s*\{ borderColor: glowColor, backgroundColor: colors\.background \},/);
  assert.match(mapScreenSource, /color: "#FFFFFF"/);
  assert.match(mapScreenSource, /categoryBtnInactive: \{\s*\n\s*backgroundColor: "rgba\(255,255,255,0\.06\)",/);
});
