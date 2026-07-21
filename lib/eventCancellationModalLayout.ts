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
