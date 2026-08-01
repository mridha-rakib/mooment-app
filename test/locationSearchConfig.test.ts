import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "lib/locationSearch.ts"), "utf8");

test("location search keeps proximity bias without hard country filtering", () => {
  const applyContextStart = source.indexOf("const applySearchContextParams");
  const storeResultsStart = source.indexOf("const storeSearchResults", applyContextStart);

  assert.notEqual(applyContextStart, -1, "applySearchContextParams should exist");
  assert.notEqual(storeResultsStart, -1, "storeSearchResults should exist after applySearchContextParams");

  const applyContextSource = source.slice(applyContextStart, storeResultsStart);

  assert.match(applyContextSource, /params\.set\("proximity", proximity\)/);
  assert.doesNotMatch(applyContextSource, /params\.set\("country"/);
});

test("location search does not inject curated or predefined venue results", () => {
  assert.doesNotMatch(source, /CURATED_/);
  assert.doesNotMatch(source, /curatedSearch/);
  assert.doesNotMatch(source, /BAF Falcon Hall/);
  assert.doesNotMatch(source, /aliases:/);
  assert.doesNotMatch(source, /\[\.\.\.curatedResults,\s*\.\.\.remoteResults\]/);
  assert.match(source, /rankSearchResults\(dedupeResults\(remoteResults\), purpose\)\.slice\(0, 8\)/);
});

test("location search can only return provider-collected results", () => {
  assert.match(source, /const remoteResults = await collectRemoteResults/);
  assert.match(source, /searchBoxSuggest\(trimmedQuery, searchContext, options\)/);
  assert.match(source, /geocodeSearch\(trimmedQuery, searchContext, options\)/);
  assert.doesNotMatch(source, /const curatedResults/);
});

test("location search cache distinguishes purpose, proximity, and no-proximity provider searches", () => {
  assert.match(source, /const normalizedContext = searchContext/);
  assert.match(source, /: "global"/);
  assert.match(source, /searchContext\.latitude\.toFixed\(3\)/);
  assert.match(source, /searchContext\.longitude\.toFixed\(3\)/);
  assert.match(source, /worldwide-v5::\$\{purpose\}::provider/);
});

test("location search has an explicit area mode for region-style searches", () => {
  assert.match(source, /export type LocationSearchPurpose = "general" \| "area"/);
  assert.match(source, /const AREA_SEARCH_FEATURE_TYPES = \[/);
  assert.match(source, /"place"/);
  assert.match(source, /"region"/);
  assert.match(source, /"district"/);
  assert.match(source, /"locality"/);
  assert.match(source, /"neighborhood"/);
  assert.match(source, /"country"/);
  assert.match(source, /"postcode"/);
  assert.match(source, /params\.set\("types", AREA_SEARCH_TYPES_PARAM\)/);
  assert.match(source, /purpose !== "area" \|\| isAreaSearchType\(suggestion\.feature_type\)/);
  assert.match(source, /purpose === "area" \? rankAreaSearchResults\(results\) : results/);
  assert.doesNotMatch(source, /New York|Madison Square Garden|BAF Falcon/i);
});
