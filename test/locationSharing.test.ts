import assert from "node:assert/strict";
import test from "node:test";
import {
  choosePreferredMapLocation,
  isRecentLocationTimestamp,
  isValidLocationCoordinate,
  toMapboxCoordinate,
  type CurrentLocationPayload,
  type MapLocationCandidate,
} from "../lib/locationSharing";

const now = new Date("2026-07-15T12:00:00.000Z").getTime();

const location = (
  latitude: number,
  longitude: number,
  timestamp: number | null = now,
): CurrentLocationPayload => ({
  latitude,
  longitude,
  timestamp,
});

test("coordinate validation rejects invalid numeric and swapped coordinate shapes", () => {
  assert.equal(isValidLocationCoordinate(location(40.73, -73.93)), true);
  assert.equal(isValidLocationCoordinate({ latitude: NaN, longitude: -73.93 }), false);
  assert.equal(isValidLocationCoordinate({ latitude: 91, longitude: -73.93 }), false);
  assert.equal(isValidLocationCoordinate({ latitude: 40.73, longitude: -181 }), false);
  assert.equal(isValidLocationCoordinate({ latitude: "-73.93" as never, longitude: 40.73 }), false);
  assert.equal(isValidLocationCoordinate({ latitude: -122.42, longitude: 37.77 }), false);
});

test("Mapbox coordinate order remains longitude then latitude", () => {
  assert.deepEqual(toMapboxCoordinate(location(40.73, -73.93)), [-73.93, 40.73]);
});

test("recent location timestamps reject stale or future cached locations", () => {
  assert.equal(isRecentLocationTimestamp(now - 30_000, 120_000, now), true);
  assert.equal(isRecentLocationTimestamp(now - 180_000, 120_000, now), false);
  assert.equal(isRecentLocationTimestamp(now + 1_000, 120_000, now), false);
  assert.equal(isRecentLocationTimestamp(null, 120_000, now), false);
});

test("fresh device location beats last-known, stored, fallback, and event candidates", () => {
  const candidates: MapLocationCandidate[] = [
    { source: "event", location: location(23.78, 90.4) },
    { source: "stored", location: location(23.78, 90.4) },
    { source: "lastKnown", location: location(39.95, -75.16, now - 30_000) },
    { source: "fresh", location: location(40.73, -73.93) },
    { source: "fallback", location: location(40.73, -73.93) },
  ];

  assert.equal(choosePreferredMapLocation(candidates, now)?.source, "fresh");
});

test("recent last-known location can beat stored and neutral fallback while waiting for fresh GPS", () => {
  const candidates: MapLocationCandidate[] = [
    { source: "stored", location: location(23.78, 90.4) },
    { source: "lastKnown", location: location(40.73, -73.93, now - 30_000) },
    { source: "fallback", location: location(40.73, -73.93, null) },
  ];

  assert.equal(choosePreferredMapLocation(candidates, now)?.source, "lastKnown");
});

test("stale last-known location does not beat a valid stored fallback", () => {
  const candidates: MapLocationCandidate[] = [
    { source: "lastKnown", location: location(23.78, 90.4, now - 300_000) },
    { source: "stored", location: location(40.73, -73.93, null) },
    { source: "fallback", location: location(40.73, -73.93, null) },
  ];

  assert.equal(choosePreferredMapLocation(candidates, now)?.source, "stored");
});

test("event marker coordinates are never selected as live user location", () => {
  const candidates: MapLocationCandidate[] = [
    { source: "event", location: location(23.78, 90.4) },
    { source: "fallback", location: location(40.73, -73.93, null) },
  ];

  assert.equal(choosePreferredMapLocation(candidates, now)?.source, "fallback");
});
