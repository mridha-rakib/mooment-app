import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "app/create-event/location-picker.tsx"),
  "utf8",
);

test("location picker guards delayed current-location initialization after user interaction", () => {
  assert.match(source, /const hasUserInteractedWithLocationRef = useRef\(false\)/);
  assert.match(source, /hasUserInteractedWithLocationRef\.current = true;\s+setQuery\(value\)/);
  assert.match(source, /!location \|\| hasUserInteractedWithLocationRef\.current/);
});

test("location picker keeps selected location as the shared camera and marker source", () => {
  assert.match(source, /centerCoordinate: \[selectedLocation\.longitude, selectedLocation\.latitude\]/);
  assert.match(source, /coordinate=\{\[selectedLocation\.longitude, selectedLocation\.latitude\]\}/);
  assert.match(source, /cameraRef\.current\?\.setCamera\(\{/);
});

test("location picker has no fixed default selected location", () => {
  assert.doesNotMatch(source, /DEFAULT_LOCATION/);
  assert.doesNotMatch(source, /23\.764288/);
  assert.doesNotMatch(source, /90\.38896/);
  assert.match(source, /useState<LocationSearchResult \| null>\(initialLocation\)/);
  assert.match(source, /const \[query, setQuery\] = useState\(initialLocation\?\.label \?\? ''\)/);
});

test("location picker separates physical search context from selected event location", () => {
  assert.match(source, /const \[deviceSearchContext, setDeviceSearchContext\] = useState<LocationSearchContext \| null>\(null\)/);
  assert.match(source, /searchLocations\(trimmedQuery, deviceSearchContext/);
  assert.doesNotMatch(source, /getSelectedSearchContext/);
  assert.doesNotMatch(source, /searchLocations\(trimmedQuery, selectedLocation/);
});

test("location picker disables confirm and omits marker without a selected event location", () => {
  assert.match(source, /disabled=\{!hasConfirmableLocation\(selectedLocation\)\}/);
  assert.match(source, /\{selectedLocation && \(\s*<Mapbox\.PointAnnotation/);
  assert.match(source, /if \(!hasConfirmableLocation\(location\)\) \{\s*return;/);
});

test("location picker uses existing physical device priority for search context", () => {
  assert.match(source, /getBestCurrentDeviceLocation\(\{/);
  assert.match(source, /requestPermission: false/);
  assert.match(source, /onTemporaryLocation: \(result\) =>/);
  assert.match(source, /setDeviceSearchContext\(\(current\) => current \?\? getSearchContextFromDeviceLocation\(result\.location\)\)/);
  assert.match(source, /result\.status !== 'fresh' && result\.status !== 'lastKnown'/);
  assert.match(source, /result\.status !== 'fresh' \|\| initialLocation/);
});

test("neutral location state cannot enter the confirm payload", () => {
  assert.match(source, /const \[selectedLocation, setSelectedLocation\] = useState<LocationSearchResult \| null>\(initialLocation\)/);
  assert.match(source, /const location = await resolveTypedLocation\(\);\s+if \(!hasConfirmableLocation\(location\)\) \{\s+return;\s+\}\s+setStepThree\(\{/);
});

test("remote selection and query clearing do not replace physical search context", () => {
  const handleSelectStart = source.indexOf("const handleSelectLocation");
  const applyDroppedStart = source.indexOf("const applyDroppedLocation", handleSelectStart);
  const searchEffectStart = source.indexOf("const trimmedQuery = query.trim();");
  const handleSelectSource = source.slice(handleSelectStart, applyDroppedStart);
  const searchEffectSource = source.slice(searchEffectStart, handleSelectStart);

  assert.notEqual(handleSelectStart, -1, "handleSelectLocation should exist");
  assert.notEqual(applyDroppedStart, -1, "applyDroppedLocation should exist after handleSelectLocation");
  assert.notEqual(searchEffectStart, -1, "search effect should exist");
  assert.match(searchEffectSource, /searchLocations\(trimmedQuery, deviceSearchContext/);
  assert.doesNotMatch(searchEffectSource, /setSelectedLocation\(null\)/);
  assert.doesNotMatch(searchEffectSource, /setDeviceSearchContext\(null\)/);
  assert.doesNotMatch(handleSelectSource, /setDeviceSearchContext/);
});
