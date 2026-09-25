import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldRefreshParticipatedWindowsOnActivate,
  shouldShowParticipatedWindowsBlockingError,
} from "../lib/participatedWindowsActivation";

test("switching into Scenes after it already loaded once triggers a background refresh", () => {
  assert.equal(shouldRefreshParticipatedWindowsOnActivate(true, false, true), true);
});

test("the very first activation does not double-fire — the focus effect already covers it", () => {
  assert.equal(shouldRefreshParticipatedWindowsOnActivate(true, false, false), false);
});

test("staying active (no false→true transition) never re-triggers a refresh", () => {
  assert.equal(shouldRefreshParticipatedWindowsOnActivate(true, true, true), false);
});

test("switching away from Scenes never triggers a refresh", () => {
  assert.equal(shouldRefreshParticipatedWindowsOnActivate(false, true, true), false);
});

test("a background refresh error is hidden while cached Scenes content exists", () => {
  assert.equal(shouldShowParticipatedWindowsBlockingError("network error", 3), false);
});

test("an error with no cached content shows the existing blocking error UI", () => {
  assert.equal(shouldShowParticipatedWindowsBlockingError("network error", 0), true);
});

test("no error never shows the blocking error UI regardless of cache size", () => {
  assert.equal(shouldShowParticipatedWindowsBlockingError(null, 0), false);
  assert.equal(shouldShowParticipatedWindowsBlockingError(null, 5), false);
});
