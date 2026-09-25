export const REWARD_SELECTOR_EXISTING_BOTTOM_PADDING = 24;
export const REWARD_SELECTOR_MAX_LIST_HEIGHT = 360;

const SHEET_VERTICAL_CLEARANCE = 32;
const SHEET_NON_LIST_HEIGHT = 50;

const normalizeInset = (value: number) => Math.max(value, 0);

export const getRewardSelectorSheetBottomPadding = (bottomInset: number) =>
  REWARD_SELECTOR_EXISTING_BOTTOM_PADDING + normalizeInset(bottomInset);

export const getRewardSelectorSheetMaxHeight = ({
  windowHeight,
  topInset,
  bottomInset,
}: {
  windowHeight: number;
  topInset: number;
  bottomInset: number;
}) =>
  Math.max(
    1,
    windowHeight - normalizeInset(topInset) - normalizeInset(bottomInset) - SHEET_VERTICAL_CLEARANCE,
  );

export const getRewardSelectorListMaxHeight = ({
  sheetMaxHeight,
  bottomPadding,
}: {
  sheetMaxHeight: number;
  bottomPadding: number;
}) =>
  Math.max(
    1,
    Math.min(
      REWARD_SELECTOR_MAX_LIST_HEIGHT,
      sheetMaxHeight - Math.max(bottomPadding, 0) - SHEET_NON_LIST_HEIGHT,
    ),
  );
