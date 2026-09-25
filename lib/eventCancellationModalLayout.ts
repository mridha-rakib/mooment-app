export type EventCancellationModalPlatform = "android" | "ios" | "web" | "windows" | "macos";

export const getCancelEventModalLayoutHeight = ({
  platform,
  screenHeight,
  windowHeight,
}: {
  platform: EventCancellationModalPlatform;
  screenHeight: number;
  windowHeight: number;
}) => (platform === "android" ? screenHeight : windowHeight);

export const getCancelEventSheetMaxHeight = ({
  layoutHeight,
  topInset,
  bottomInset,
}: {
  layoutHeight: number;
  topInset: number;
  bottomInset: number;
}) => Math.max(1, layoutHeight - Math.max(topInset, 0) - Math.max(bottomInset, 0) - 16);

export const getCancelEventSheetBottomPadding = (bottomInset: number) =>
  24 + Math.max(bottomInset, 0);

export const getCancelEventSheetScrollBottomPadding = ({
  bottomInset,
  keyboardBottomInset,
}: {
  bottomInset: number;
  keyboardBottomInset: number;
}) => 24 + Math.max(Math.max(bottomInset, 0), Math.max(keyboardBottomInset, 0));

export const getCancelEventKeyboardBottomInset = ({
  platform,
  layoutHeight,
  keyboardHeight,
  keyboardScreenY,
}: {
  platform: EventCancellationModalPlatform;
  layoutHeight: number;
  keyboardHeight: number;
  keyboardScreenY?: number;
}) => {
  if (platform !== "android") {
    return 0;
  }

  const coordinateOverlap =
    typeof keyboardScreenY === "number" && keyboardScreenY > 0
      ? Math.max(0, layoutHeight - keyboardScreenY)
      : 0;

  return Math.max(coordinateOverlap, Math.max(keyboardHeight, 0));
};

export const getCancelEventReasonInputScrollOffset = ({
  currentScrollY,
  inputY,
  inputHeight,
  viewportHeight,
  keyboardBottomInset,
  margin = 16,
}: {
  currentScrollY: number;
  inputY: number;
  inputHeight: number;
  viewportHeight: number;
  keyboardBottomInset: number;
  margin?: number;
}) => {
  const visibleHeight = Math.max(
    1,
    viewportHeight - Math.max(keyboardBottomInset, 0) - Math.max(margin, 0),
  );
  const requiredOffset = Math.max(0, inputY + inputHeight - visibleHeight);

  return Math.max(Math.max(currentScrollY, 0), requiredOffset);
};

export const shouldUseCancelEventKeyboardAvoidingView = (
  platform: EventCancellationModalPlatform,
) => platform === "ios";

export const shouldDismissKeyboardForCancelEventBack = ({
  platform,
  visible,
  keyboardVisible,
}: {
  platform: EventCancellationModalPlatform;
  visible: boolean;
  keyboardVisible: boolean;
}) => platform === "android" && visible && keyboardVisible;
