// App-wide success feedback bus.
//
// This is intentionally NOT a React context: success points live in plain
// async handlers (and a few module-scoped helpers) spread across the app, so
// the public API is a single function any code can import and call. A single
// <SuccessToastHost /> mounted in app/_layout.tsx subscribes to this bus and
// renders the branded snackbar.
//
// Contract:
//  - notifySuccess() never throws and never blocks the caller.
//  - If no host is mounted yet (very early boot) the call is a silent no-op.
//  - It performs no navigation, no network, and mutates no app state.

export type SuccessFeedbackListener = (message: string) => void;

let activeListener: SuccessFeedbackListener | null = null;

/** Registered by <SuccessToastHost /> on mount; cleared on unmount. */
export function setSuccessFeedbackListener(
  listener: SuccessFeedbackListener | null,
): void {
  activeListener = listener;
}

/**
 * Show a brief, non-blocking, auto-dismissing success snackbar.
 * Safe to call from anywhere (component or plain function).
 */
export function notifySuccess(message: string): void {
  const text = typeof message === 'string' ? message.trim() : '';

  if (!text || !activeListener) {
    return;
  }

  try {
    activeListener(text);
  } catch {
    // A failure inside the toast host must never surface at a success
    // call site — swallow and continue the original flow untouched.
  }
}
