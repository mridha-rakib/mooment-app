import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const filterModalSource = readFileSync(
  join(process.cwd(), "components/home/FilterModal.tsx"),
  "utf8",
);
const locationSearchModalSource = readFileSync(
  join(process.cwd(), "components/post/LocationSearchModal.tsx"),
  "utf8",
);
const locationPickerSource = readFileSync(
  join(process.cwd(), "app/create-event/location-picker.tsx"),
  "utf8",
);

test("event filter location picker requests area-style location search", () => {
  assert.match(filterModalSource, /<LocationSearchModal/);
  assert.match(filterModalSource, /searchPurpose="area"/);
  assert.match(filterModalSource, /searchContext=\{locationSearchContext\}/);
});

test("shared location search modal defaults to general search for existing callers", () => {
  assert.match(locationSearchModalSource, /type LocationSearchPurpose/);
  assert.match(locationSearchModalSource, /searchPurpose = 'general'/);
  assert.match(locationSearchModalSource, /purpose: searchPurpose/);
  assert.match(locationSearchModalSource, /\[searchContext, searchPurpose, searchQuery, visible\]/);
});

test("create and edit map location search remains on the general default", () => {
  assert.match(locationPickerSource, /searchLocations\(trimmedQuery, deviceSearchContext/);
  assert.doesNotMatch(locationPickerSource, /searchPurpose="area"/);
  assert.doesNotMatch(locationPickerSource, /purpose:\s*['"]area['"]/);
});
