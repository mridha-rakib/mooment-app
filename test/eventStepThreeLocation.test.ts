import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStepThreePersistedLocation,
  buildStepThreeValidationLocation,
  getStepThreeLocationDisplayLabel,
} from "../lib/eventStepThreeLocation";
import type { EventLocation } from "../lib/events";

const selectedLocation: EventLocation = {
  searchLabel: "BAF Falcon Hall, Old Airport Road, Tejgaon, Dhaka 1215, Bangladesh",
  venue: "BAF Falcon Hall",
  address: "Old Airport Road, Tejgaon, Dhaka 1215, Bangladesh",
  additionalInfo: "Gate 2",
  latitude: 23.77195,
  longitude: 90.39018,
};

test("address edits persist only address while preserving location label, venue, coordinates, and additional info", () => {
  const persisted = buildStepThreePersistedLocation({
    draftLocation: selectedLocation,
    venue: selectedLocation.venue ?? "",
    address: "Updated entrance address",
    additionalInfo: selectedLocation.additionalInfo ?? "",
  });

  assert.equal(persisted.searchLabel, selectedLocation.searchLabel);
  assert.equal(persisted.address, "Updated entrance address");
  assert.equal(persisted.venue, selectedLocation.venue);
  assert.equal(persisted.latitude, selectedLocation.latitude);
  assert.equal(persisted.longitude, selectedLocation.longitude);
  assert.equal(persisted.additionalInfo, selectedLocation.additionalInfo);
});

test("replacing the complete address preserves the selected location label", () => {
  const persisted = buildStepThreePersistedLocation({
    draftLocation: selectedLocation,
    venue: "Manual venue",
    address: "Completely rewritten full address",
    additionalInfo: "",
  });

  assert.equal(persisted.searchLabel, selectedLocation.searchLabel);
  assert.equal(persisted.address, "Completely rewritten full address");
  assert.equal(persisted.venue, "Manual venue");
  assert.equal(persisted.additionalInfo, null);
});

test("clearing address does not clear location label, venue, or coordinates", () => {
  const persisted = buildStepThreePersistedLocation({
    draftLocation: selectedLocation,
    venue: selectedLocation.venue ?? "",
    address: "   ",
    additionalInfo: selectedLocation.additionalInfo ?? "",
  });

  assert.equal(persisted.searchLabel, selectedLocation.searchLabel);
  assert.equal(persisted.address, null);
  assert.equal(persisted.venue, selectedLocation.venue);
  assert.equal(persisted.latitude, selectedLocation.latitude);
  assert.equal(persisted.longitude, selectedLocation.longitude);
});

test("venue edits persist only venue while preserving location label, address, and coordinates", () => {
  const persisted = buildStepThreePersistedLocation({
    draftLocation: selectedLocation,
    venue: "Manual venue rewrite",
    address: selectedLocation.address ?? "",
    additionalInfo: selectedLocation.additionalInfo ?? "",
  });

  assert.equal(persisted.searchLabel, selectedLocation.searchLabel);
  assert.equal(persisted.venue, "Manual venue rewrite");
  assert.equal(persisted.address, selectedLocation.address);
  assert.equal(persisted.latitude, selectedLocation.latitude);
  assert.equal(persisted.longitude, selectedLocation.longitude);
});

test("validation keeps search label, venue, and address independent", () => {
  assert.deepEqual(
    buildStepThreeValidationLocation(selectedLocation, "Manual venue", "Manual address"),
    {
      searchLabel: selectedLocation.searchLabel,
      venue: "Manual venue",
      address: "Manual address",
    },
  );

  assert.deepEqual(
    buildStepThreeValidationLocation({}, "", "Legacy manual address"),
    {
      searchLabel: null,
      venue: null,
      address: "Legacy manual address",
    },
  );
});

test("legacy address-only locations display address without persisting it into searchLabel", () => {
  const draftLocation: EventLocation = {
    address: "Legacy stored address",
    latitude: 40,
    longitude: -73,
  };

  assert.equal(getStepThreeLocationDisplayLabel(draftLocation, draftLocation.address ?? ""), "Legacy stored address");

  const persisted = buildStepThreePersistedLocation({
    draftLocation,
    venue: "",
    address: "Edited legacy address",
    additionalInfo: "",
  });

  assert.equal(persisted.searchLabel, null);
  assert.equal(persisted.address, "Edited legacy address");
  assert.equal(persisted.latitude, 40);
  assert.equal(persisted.longitude, -73);
});

test("a later selected location remains the canonical label and keeps picker autofill fields", () => {
  const newSelection: EventLocation = {
    ...selectedLocation,
    searchLabel: "New Venue, New Address",
    venue: "New Venue",
    address: "New Address",
    latitude: 34.052235,
    longitude: -118.243683,
  };

  const persisted = buildStepThreePersistedLocation({
    draftLocation: newSelection,
    venue: newSelection.venue ?? "",
    address: newSelection.address ?? "",
    additionalInfo: "Updated notes",
  });

  assert.equal(persisted.searchLabel, "New Venue, New Address");
  assert.equal(persisted.venue, "New Venue");
  assert.equal(persisted.address, "New Address");
  assert.equal(persisted.latitude, 34.052235);
  assert.equal(persisted.longitude, -118.243683);
  assert.equal(persisted.additionalInfo, "Updated notes");
});
