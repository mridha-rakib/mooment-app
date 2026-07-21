import assert from "node:assert/strict";
import test from "node:test";

import {
  getCancelEventModalLayoutHeight,
  getCancelEventSheetBottomPadding,
  getCancelEventSheetMaxHeight,
  shouldDismissKeyboardForCancelEventBack,
  shouldUseCancelEventKeyboardAvoidingView,
} from "../lib/eventCancellationModalLayout";

test("Android cancellation modal layout uses screen height instead of keyboard-resized window height", () => {
  const keyboardClosed = getCancelEventModalLayoutHeight({
    platform: "android",
    screenHeight: 1600,
    windowHeight: 1480,
  });
  const keyboardOpen = getCancelEventModalLayoutHeight({
    platform: "android",
    screenHeight: 1600,
    windowHeight: 940,
  });

  assert.equal(keyboardClosed, 1600);
  assert.equal(keyboardOpen, keyboardClosed);
});

test("iOS cancellation modal layout keeps using window height for KeyboardAvoidingView", () => {
  assert.equal(
    getCancelEventModalLayoutHeight({
      platform: "ios",
      screenHeight: 1600,
      windowHeight: 1480,
    }),
    1480,
  );
});

test("Android cancellation modal does not use KeyboardAvoidingView", () => {
  assert.equal(shouldUseCancelEventKeyboardAvoidingView("android"), false);
  assert.equal(shouldUseCancelEventKeyboardAvoidingView("ios"), true);
});

test("sheet height and footer padding keep safe-area inset math single-pass", () => {
  assert.equal(
    getCancelEventSheetMaxHeight({
      layoutHeight: 1600,
      topInset: 48,
      bottomInset: 72,
    }),
    1464,
  );
  assert.equal(getCancelEventSheetBottomPadding(72), 96);
});

test("sheet height and footer padding clamp invalid inset values without changing layout branch", () => {
  assert.equal(
    getCancelEventSheetMaxHeight({
      layoutHeight: 12,
      topInset: 40,
      bottomInset: 40,
    }),
    1,
  );
  assert.equal(getCancelEventSheetBottomPadding(-10), 24);
});

test("Android cancellation modal Back consumes only keyboard-open presses", () => {
  assert.equal(
    shouldDismissKeyboardForCancelEventBack({
      platform: "android",
      visible: true,
      keyboardVisible: true,
    }),
    true,
  );
  assert.equal(
    shouldDismissKeyboardForCancelEventBack({
      platform: "android",
      visible: true,
      keyboardVisible: false,
    }),
    false,
  );
  assert.equal(
    shouldDismissKeyboardForCancelEventBack({
      platform: "android",
      visible: false,
      keyboardVisible: true,
    }),
    false,
  );
  assert.equal(
    shouldDismissKeyboardForCancelEventBack({
      platform: "ios",
      visible: true,
      keyboardVisible: true,
    }),
    false,
  );
});
