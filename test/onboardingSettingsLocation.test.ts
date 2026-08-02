import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "app/auth-screen/onboarding-settings.tsx"),
  "utf8",
);

const updatePayload = source.slice(
  source.indexOf("await updateProfile({"),
  source.indexOf("});", source.indexOf("await updateProfile({")),
);

test("onboarding Location Service uses the bounded best-location flow", () => {
  assert.match(source, /getBestCurrentDeviceLocation/);
  assert.doesNotMatch(source, /getCurrentLocationForSharing/);
  assert.match(source, /result\.status === "fresh" \|\| result\.status === "lastKnown"/);
  assert.match(source, /cachedLocationRef\.current = result\.location/);
});

test("onboarding handles no-location outcomes without fake coordinates", () => {
  assert.match(source, /location:\s*null/);
  assert.match(source, /shouldEnableLocation = Boolean\(currentLocation\)/);
  assert.match(updatePayload, /currentLocationSharingEnabled:\s*shouldEnableLocation/);
  assert.match(updatePayload, /currentLocation,/);
  assert.doesNotMatch(source, /reverseGeocode/i);
  assert.doesNotMatch(source, /0\s*,\s*0/);
  assert.doesNotMatch(source, /23\.764288|90\.38896/);
});

test("onboarding protects toggle-off, unmount, and duplicate completion races", () => {
  assert.match(source, /locationRequestGenerationRef\.current \+= 1/);
  assert.match(source, /requestGeneration !== locationRequestGenerationRef\.current/);
  assert.match(source, /isMountedRef\.current = false/);
  assert.match(source, /hasCompletedRef\.current/);
});

test("Done is only blocked by finite completion or bounded location resolution", () => {
  assert.match(source, /const isBusy = isCompleting \|\| isResolvingLocation/);
  assert.match(source, /setIsResolvingLocation\(false\)/);
  assert.match(source, /disabled=\{isBusy\}/);
});

test("Notification toggle behavior remains direct and independent", () => {
  assert.match(source, /onValueChange=\{setNotificationsEnabled\}/);
  assert.match(updatePayload, /notificationsEnabled,/);
});
