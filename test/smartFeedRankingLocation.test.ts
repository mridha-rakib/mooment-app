import assert from "node:assert/strict";
import test from "node:test";

import { getSmartFeedRankingLocation } from "@/lib/smartFeedRankingLocation";

test("returns ranking-only params when a valid coordinate is available", async () => {
  const result = await getSmartFeedRankingLocation(async () => ({ latitude: 40.7128, longitude: -74.006 }));
  assert.deepEqual(result, { rankingLatitude: 40.7128, rankingLongitude: -74.006 });
  // ranking-only keys — never the Nearby filter keys
  assert.equal("latitude" in result, false);
  assert.equal("longitude" in result, false);
  assert.equal("radiusKm" in result, false);
});

test("returns {} when permission is not granted / no location (request stays valid)", async () => {
  const result = await getSmartFeedRankingLocation(async () => null);
  assert.deepEqual(result, {});
});

test("returns {} when the location read throws (feed must still load)", async () => {
  const result = await getSmartFeedRankingLocation(async () => {
    throw new Error("location services unavailable");
  });
  assert.deepEqual(result, {});
});

test("does not block: a slow read resolves to {} at the timeout", async () => {
  const start = Date.now();
  const result = await getSmartFeedRankingLocation(
    () => new Promise((resolve) => setTimeout(() => resolve({ latitude: 1, longitude: 2 }), 5000)),
    50,
  );
  assert.deepEqual(result, {});
  assert.ok(Date.now() - start < 2000);
});

test("rejects out-of-range / non-finite coordinates", async () => {
  assert.deepEqual(await getSmartFeedRankingLocation(async () => ({ latitude: Number.NaN, longitude: 2 })), {});
  assert.deepEqual(await getSmartFeedRankingLocation(async () => ({ latitude: 200, longitude: 2 })), {});
  assert.deepEqual(await getSmartFeedRankingLocation(async () => ({ latitude: 10, longitude: 999 })), {});
});

test("ranking coords coexist with an explicit Nearby filter without collision", async () => {
  const eventRequestParams = { limit: 100, latitude: 12, longitude: 34, radiusKm: 10 };
  const ranking = await getSmartFeedRankingLocation(async () => ({ latitude: 12, longitude: 34 }));
  const merged = { ...eventRequestParams, ...ranking };
  assert.equal(merged.latitude, 12); // explicit Nearby filter preserved
  assert.equal(merged.radiusKm, 10);
  assert.equal(merged.rankingLatitude, 12); // ranking-only key added alongside
  assert.equal(merged.rankingLongitude, 34);
});
