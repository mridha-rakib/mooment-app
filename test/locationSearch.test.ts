import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocationSearchProximityParam,
  type LocationSearchContext,
} from "../lib/locationSearchContext";

test("location search proximity uses Mapbox longitude-latitude order", () => {
  const context: LocationSearchContext = {
    latitude: 23.7806,
    longitude: 90.4074,
    label: "Device Location",
  };

  assert.equal(getLocationSearchProximityParam(context), "90.4074,23.7806");
});

test("location search proximity is optional for invalid device coordinates", () => {
  const context = {
    latitude: Number.NaN,
    longitude: 90.4074,
    label: "Device Location",
  } as LocationSearchContext;

  assert.equal(getLocationSearchProximityParam(context), null);
  assert.equal(getLocationSearchProximityParam(null), null);
});
