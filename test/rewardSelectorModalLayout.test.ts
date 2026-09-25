import assert from "node:assert/strict";
import test from "node:test";

import {
  getRewardSelectorListMaxHeight,
  getRewardSelectorSheetBottomPadding,
  getRewardSelectorSheetMaxHeight,
  REWARD_SELECTOR_EXISTING_BOTTOM_PADDING,
  REWARD_SELECTOR_MAX_LIST_HEIGHT,
} from "../lib/rewardSelectorModalLayout";

test("reward selector keeps existing bottom spacing when inset is zero", () => {
  assert.equal(
    getRewardSelectorSheetBottomPadding(0),
    REWARD_SELECTOR_EXISTING_BOTTOM_PADDING,
  );
});

test("reward selector applies positive bottom inset exactly once", () => {
  assert.equal(
    getRewardSelectorSheetBottomPadding(34),
    REWARD_SELECTOR_EXISTING_BOTTOM_PADDING + 34,
  );
});

test("reward selector max height is bounded by usable viewport", () => {
  assert.equal(
    getRewardSelectorSheetMaxHeight({
      windowHeight: 800,
      topInset: 24,
      bottomInset: 48,
    }),
    696,
  );
});

test("reward selector list preserves current normal max height when space allows", () => {
  assert.equal(
    getRewardSelectorListMaxHeight({
      sheetMaxHeight: 696,
      bottomPadding: 72,
    }),
    REWARD_SELECTOR_MAX_LIST_HEIGHT,
  );
});

test("reward selector list shrinks on small screens so final rows remain reachable", () => {
  assert.equal(
    getRewardSelectorListMaxHeight({
      sheetMaxHeight: 220,
      bottomPadding: 72,
    }),
    98,
  );
});

test("reward selector layout clamps invalid insets without changing normal spacing", () => {
  assert.equal(getRewardSelectorSheetBottomPadding(-12), REWARD_SELECTOR_EXISTING_BOTTOM_PADDING);
  assert.equal(
    getRewardSelectorSheetMaxHeight({
      windowHeight: 100,
      topInset: -10,
      bottomInset: -20,
    }),
    68,
  );
});
