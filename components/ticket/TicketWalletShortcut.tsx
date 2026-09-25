// import { useTheme } from "@/hooks/useTheme";
// import { useAuthStore } from "@/stores/authStore";
// import { useTicketWalletShortcutStore } from "@/stores/ticketWalletShortcutStore";
// import { Cancel01Icon, Ticket02Icon } from "@hugeicons/core-free-icons";
// import { HugeiconsIcon } from "@hugeicons/react-native";
// import { useRouter, useSegments } from "expo-router";
// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";
// import {
//   Animated,
//   Easing,
//   Keyboard,
//   PanResponder,
//   Platform,
//   StyleSheet,
//   View,
//   useWindowDimensions,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// const BUTTON_SIZE = 64;
// const ICON_SIZE = 32;
// const EDGE_GAP = 12;
// const TOP_UI_CLEARANCE = 56;
// const DEFAULT_RIGHT = 12;
// const DEFAULT_TOP_RATIO = 0.52;
// const BOTTOM_TAB_CLEARANCE = 96;
// const DISMISS_SIZE = 72;
// const TAP_SLOP = 7;
// const NAVIGATION_LOCK_MS = 700;

// const BLOCKED_ROOT_SEGMENTS = new Set([
//   "auth-screen",
//   "create-event",
//   "error",
//   "live-screen",
//   "post-screen",
// ]);

// const BLOCKED_EVENT_SCREEN_SEGMENTS = new Set([
//   "checkout",
//   "map",
//   "payment-success",
//   "qr-code",
//   "scan-qr",
//   "ticket-detail",
//   "wallet",
// ]);

// const BLOCKED_PRODUCT_EVENT_SEGMENTS = new Set(["cart", "checkout", "wallet"]);

// const BLOCKED_PLAN_SCREEN_SEGMENTS = new Set([
//   "map-selection",
//   "view-location",
// ]);

// const clamp = (value: number, min: number, max: number) =>
//   Math.min(Math.max(value, min), max);

// const positionsMatch = (
//   left: { x: number; y: number },
//   right: { x: number; y: number },
// ) => Math.abs(left.x - right.x) < 0.5 && Math.abs(left.y - right.y) < 0.5;

// const getNearestHorizontalEdge = (
//   position: { x: number },
//   width: number,
// ): "left" | "right" =>
//   position.x + BUTTON_SIZE / 2 < width / 2 ? "left" : "right";

// const isNearDismissTarget = (
//   x: number,
//   y: number,
//   width: number,
//   height: number,
//   bottomInset: number,
// ) => {
//   const centerX = x + BUTTON_SIZE / 2;
//   const centerY = y + BUTTON_SIZE / 2;
//   const targetX = width / 2;
//   const targetY = height - Math.max(bottomInset + 36, 60);
//   const distance = Math.hypot(centerX - targetX, centerY - targetY);

//   return distance <= DISMISS_SIZE / 2 + BUTTON_SIZE / 2;
// };

// export default function TicketWalletShortcut() {
//   const router = useRouter();
//   const segments = useSegments();
//   const { width, height } = useWindowDimensions();
//   const insets = useSafeAreaInsets();
//   const { isDark } = useTheme();
//   const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
//   const hasRestoredAuth = useAuthStore((state) => state.hasRestored);
//   const isHydrated = useTicketWalletShortcutStore((state) => state.isHydrated);
//   const isVisible = useTicketWalletShortcutStore((state) => state.isVisible);
//   const storedPosition = useTicketWalletShortcutStore(
//     (state) => state.position,
//   );
//   const hydrate = useTicketWalletShortcutStore((state) => state.hydrate);
//   const hide = useTicketWalletShortcutStore((state) => state.hide);
//   const setStoredPosition = useTicketWalletShortcutStore(
//     (state) => state.setPosition,
//   );
//   const [keyboardHeight, setKeyboardHeight] = useState(0);
//   const [isDragging, setIsDragging] = useState(false);
//   const [isPositionReady, setIsPositionReady] = useState(false);
//   const animatedPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
//   const dragStartRef = useRef({ x: 0, y: 0 });
//   const lastPositionRef = useRef({ x: 0, y: 0 });
//   const hasPlacedInitialPositionRef = useRef(false);
//   const isDraggingRef = useRef(false);
//   const keyboardHeightRef = useRef(0);
//   const edgeSideRef = useRef<"left" | "right">("right");
//   const navigationLockedRef = useRef(false);
//   const navigationUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
//     null,
//   );
//   const preKeyboardPositionRef = useRef<{ x: number; y: number } | null>(null);
//   const pendingKeyboardRestoreRef = useRef(false);
//   const draggedDuringKeyboardRef = useRef(false);

//   const firstSegment = segments[0];
//   const secondSegment = segments[1];
//   const thirdSegment = segments[2];
//   const isTicketWalletRoute =
//     firstSegment === "event-screen" && secondSegment === "wallet";
//   const isBlockedRoute =
//     !firstSegment ||
//     BLOCKED_ROOT_SEGMENTS.has(firstSegment) ||
//     (firstSegment === "event-screen" &&
//       (BLOCKED_EVENT_SCREEN_SEGMENTS.has(secondSegment ?? "") ||
//         (secondSegment === "product" &&
//           BLOCKED_PRODUCT_EVENT_SEGMENTS.has(thirdSegment ?? "")))) ||
//     (firstSegment === "plan-screen" &&
//       BLOCKED_PLAN_SCREEN_SEGMENTS.has(secondSegment ?? ""));
//   const shouldRender =
//     Platform.OS !== "web" &&
//     hasRestoredAuth &&
//     isAuthenticated &&
//     !isBlockedRoute;

//   const bounds = useMemo(() => {
//     const bottomClearance =
//       keyboardHeight > 0
//         ? keyboardHeight + EDGE_GAP
//         : BOTTOM_TAB_CLEARANCE + insets.bottom;

//     return {
//       minX: EDGE_GAP,
//       maxX: Math.max(EDGE_GAP, width - BUTTON_SIZE - EDGE_GAP),
//       minY: Math.max(EDGE_GAP, insets.top + TOP_UI_CLEARANCE),
//       maxY: Math.max(
//         insets.top + TOP_UI_CLEARANCE,
//         height - BUTTON_SIZE - bottomClearance,
//       ),
//       dismissBottomInset:
//         keyboardHeight > 0 ? keyboardHeight + insets.bottom : insets.bottom,
//     };
//   }, [height, insets.bottom, insets.top, keyboardHeight, width]);

//   const clampPosition = useCallback(
//     (position: { x: number; y: number }) => ({
//       x: clamp(position.x, bounds.minX, bounds.maxX),
//       y: clamp(position.y, bounds.minY, bounds.maxY),
//     }),
//     [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY],
//   );

//   const syncAnimatedPosition = useCallback(
//     (position: { x: number; y: number }, animated = false) => {
//       const nextPosition = clampPosition(position);
//       lastPositionRef.current = nextPosition;

//       if (animated) {
//         animatedPosition.stopAnimation();
//         Animated.timing(animatedPosition, {
//           toValue: nextPosition,
//           duration: 180,
//           easing: Easing.out(Easing.cubic),
//           useNativeDriver: true,
//         }).start();
//       } else {
//         animatedPosition.stopAnimation();
//         animatedPosition.setValue(nextPosition);
//       }

//       return nextPosition;
//     },
//     [animatedPosition, clampPosition],
//   );

//   const persistPosition = useCallback(
//     (position: { x: number; y: number }) => {
//       void setStoredPosition(position).catch(() => undefined);
//     },
//     [setStoredPosition],
//   );

//   useEffect(() => {
//     void hydrate();
//   }, [hydrate]);

//   useEffect(() => {
//     if (!isTicketWalletRoute) {
//       navigationLockedRef.current = false;
//     }
//   }, [isTicketWalletRoute]);

//   useEffect(
//     () => () => {
//       animatedPosition.stopAnimation();

//       if (navigationUnlockTimerRef.current) {
//         clearTimeout(navigationUnlockTimerRef.current);
//       }
//     },
//     [animatedPosition],
//   );

//   useEffect(() => {
//     const showSubscription = Keyboard.addListener(
//       "keyboardDidShow",
//       (event) => {
//         if (keyboardHeightRef.current === 0) {
//           preKeyboardPositionRef.current = lastPositionRef.current;
//           draggedDuringKeyboardRef.current = false;
//         }

//         keyboardHeightRef.current = event.endCoordinates.height;
//         setKeyboardHeight(event.endCoordinates.height);
//       },
//     );
//     const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
//       keyboardHeightRef.current = 0;
//       pendingKeyboardRestoreRef.current = true;
//       setKeyboardHeight(0);
//     });

//     return () => {
//       showSubscription.remove();
//       hideSubscription.remove();
//     };
//   }, []);

//   useEffect(() => {
//     if (!isHydrated || width <= 0 || height <= 0) {
//       return;
//     }

//     const fallback = {
//       x: width - BUTTON_SIZE - DEFAULT_RIGHT,
//       y: height * DEFAULT_TOP_RATIO,
//     };
//     const keyboardRestorePosition =
//       pendingKeyboardRestoreRef.current && !draggedDuringKeyboardRef.current
//         ? preKeyboardPositionRef.current
//         : null;
//     const desiredPosition =
//       keyboardRestorePosition ??
//       (hasPlacedInitialPositionRef.current
//         ? lastPositionRef.current
//         : (storedPosition ?? fallback));
//     const edgeAdjustedPosition =
//       hasPlacedInitialPositionRef.current && keyboardHeight === 0
//         ? {
//             ...desiredPosition,
//             x: edgeSideRef.current === "left" ? bounds.minX : bounds.maxX,
//           }
//         : desiredPosition;
//     const nextPosition = syncAnimatedPosition(
//       edgeAdjustedPosition,
//       hasPlacedInitialPositionRef.current,
//     );

//     hasPlacedInitialPositionRef.current = true;
//     edgeSideRef.current = getNearestHorizontalEdge(nextPosition, width);
//     setIsPositionReady(true);
//     pendingKeyboardRestoreRef.current = false;
//     preKeyboardPositionRef.current = null;

//     if (
//       keyboardHeight === 0 &&
//       (!storedPosition || !positionsMatch(nextPosition, edgeAdjustedPosition))
//     ) {
//       persistPosition(nextPosition);
//     }
//   }, [
//     bounds.maxX,
//     bounds.minX,
//     height,
//     isHydrated,
//     keyboardHeight,
//     persistPosition,
//     storedPosition,
//     syncAnimatedPosition,
//     width,
//   ]);

//   const snapToEdge = useCallback(
//     (position: { x: number; y: number }) => {
//       const centeredX = position.x + BUTTON_SIZE / 2;
//       const edgeX = centeredX < width / 2 ? bounds.minX : bounds.maxX;
//       edgeSideRef.current = centeredX < width / 2 ? "left" : "right";

//       return syncAnimatedPosition({ x: edgeX, y: position.y }, true);
//     },
//     [bounds.maxX, bounds.minX, syncAnimatedPosition, width],
//   );

//   const handleOpenWallet = useCallback(() => {
//     if (isTicketWalletRoute || navigationLockedRef.current) {
//       return;
//     }

//     navigationLockedRef.current = true;
//     router.push("/event-screen/wallet");

//     if (navigationUnlockTimerRef.current) {
//       clearTimeout(navigationUnlockTimerRef.current);
//     }

//     navigationUnlockTimerRef.current = setTimeout(() => {
//       navigationLockedRef.current = false;
//     }, NAVIGATION_LOCK_MS);
//   }, [isTicketWalletRoute, router]);

//   const handleHide = useCallback(() => {
//     isDraggingRef.current = false;
//     setIsDragging(false);
//     void hide().catch(() => undefined);
//   }, [hide]);

//   const panResponder = useMemo(
//     () =>
//       PanResponder.create({
//         onStartShouldSetPanResponder: () => true,
//         onMoveShouldSetPanResponder: (_, gestureState) =>
//           Math.abs(gestureState.dx) > TAP_SLOP ||
//           Math.abs(gestureState.dy) > TAP_SLOP,
//         onPanResponderGrant: () => {
//           animatedPosition.stopAnimation();
//           dragStartRef.current = lastPositionRef.current;
//         },
//         onPanResponderMove: (_, gestureState) => {
//           const nextPosition = clampPosition({
//             x: dragStartRef.current.x + gestureState.dx,
//             y: dragStartRef.current.y + gestureState.dy,
//           });

//           if (
//             !isDraggingRef.current &&
//             (Math.abs(gestureState.dx) > TAP_SLOP ||
//               Math.abs(gestureState.dy) > TAP_SLOP)
//           ) {
//             isDraggingRef.current = true;
//             setIsDragging(true);
//           }

//           if (keyboardHeightRef.current > 0) {
//             draggedDuringKeyboardRef.current = true;
//           }

//           lastPositionRef.current = nextPosition;
//           animatedPosition.setValue(nextPosition);
//         },
//         onPanResponderRelease: (_, gestureState) => {
//           const nextPosition = clampPosition({
//             x: dragStartRef.current.x + gestureState.dx,
//             y: dragStartRef.current.y + gestureState.dy,
//           });
//           const didDrag =
//             Math.abs(gestureState.dx) > TAP_SLOP ||
//             Math.abs(gestureState.dy) > TAP_SLOP;

//           isDraggingRef.current = false;
//           setIsDragging(false);

//           if (!didDrag) {
//             handleOpenWallet();
//             return;
//           }

//           if (
//             isNearDismissTarget(
//               nextPosition.x,
//               nextPosition.y,
//               width,
//               height,
//               bounds.dismissBottomInset,
//             )
//           ) {
//             handleHide();
//             return;
//           }

//           const snappedPosition = snapToEdge(nextPosition);
//           persistPosition(snappedPosition);
//         },
//         onPanResponderTerminate: () => {
//           isDraggingRef.current = false;
//           setIsDragging(false);
//           const snappedPosition = snapToEdge(lastPositionRef.current);
//           persistPosition(snappedPosition);
//         },
//       }),
//     [
//       animatedPosition,
//       bounds.dismissBottomInset,
//       clampPosition,
//       handleHide,
//       handleOpenWallet,
//       height,
//       persistPosition,
//       snapToEdge,
//       width,
//     ],
//   );

//   if (!shouldRender || !isHydrated || !isVisible || !isPositionReady) {
//     return null;
//   }

//   return (
//     <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
//       {isDragging && (
//         <View
//           pointerEvents="none"
//           style={[
//             styles.dismissTarget,
//             {
//               bottom: Math.max(bounds.dismissBottomInset + 16, 24),
//               backgroundColor: isDark
//                 ? "rgba(255,255,255,0.14)"
//                 : "rgba(17,17,17,0.12)",
//             },
//           ]}
//         >
//           <HugeiconsIcon
//             icon={Cancel01Icon}
//             size={24}
//             color={isDark ? "#FFFFFF" : "#111111"}
//           />
//         </View>
//       )}
//       <Animated.View
//         pointerEvents="auto"
//         style={[
//           styles.shortcut,
//           {
//             transform: animatedPosition.getTranslateTransform(),
//             backgroundColor: isDark
//               ? "rgba(17, 17, 17, 0.82)"
//               : "rgba(17, 17, 17, 0.7)",
//           },
//           isDragging && styles.shortcutDragging,
//         ]}
//         {...panResponder.panHandlers}
//         accessibilityRole="button"
//         accessibilityLabel="Open Ticket Wallet"
//         accessibilityHint="Opens your Ticket Wallet. Drag to move the shortcut, or drag to the dismiss area to hide it."
//         onAccessibilityTap={handleOpenWallet}
//       >
//         <HugeiconsIcon
//           icon={Ticket02Icon}
//           size={ICON_SIZE}
//           color="#B3B3B3"
//           strokeWidth={2}
//         />
//       </Animated.View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   shortcut: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     width: BUTTON_SIZE,
//     height: BUTTON_SIZE,
//     borderRadius: 999,
//     padding: 16,
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 1000,
//     elevation: 12,
//     shadowColor: "#000000",
//     shadowOffset: { width: 0, height: 8 },
//     shadowOpacity: 0.28,
//     shadowRadius: 14,
//   },
//   shortcutDragging: {
//     opacity: 0.92,
//   },
//   dismissTarget: {
//     position: "absolute",
//     left: "50%",
//     width: DISMISS_SIZE,
//     height: DISMISS_SIZE,
//     marginBottom: 50,
//     marginLeft: -DISMISS_SIZE / 2,
//     borderRadius: DISMISS_SIZE / 2,
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 999,
//   },
// });

import { useTheme } from "@/hooks/useTheme";
import {
  getActiveTicketWalletCount,
  getMyTicketWallet,
  TICKET_WALLET_CHANGED_EVENT,
  type TicketWalletChangedEvent,
} from "@/lib/payments";
import { useAuthStore } from "@/stores/authStore";
import { useTicketWalletShortcutStore } from "@/stores/ticketWalletShortcutStore";
import { Cancel01Icon, Ticket02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter, useSegments } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  DeviceEventEmitter,
  Easing,
  Keyboard,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BUTTON_SIZE = 64;
const ICON_SIZE = 32;
const EDGE_GAP = 12;
const TOP_UI_CLEARANCE = 56;
const DEFAULT_RIGHT = 12;
const DEFAULT_TOP_RATIO = 0.52;
const BOTTOM_TAB_CLEARANCE = 96;
const DISMISS_SIZE = 72;
const DELETE_ZONE_SIZE = DISMISS_SIZE + 20;
const TAP_SLOP = 7;
const NAVIGATION_LOCK_MS = 700;

const BLOCKED_ROOT_SEGMENTS = new Set([
  "auth-screen",
  "create-event",
  "error",
  "live-screen",
  "post-screen",
]);

const BLOCKED_EVENT_SCREEN_SEGMENTS = new Set([
  "checkout",
  "map",
  "payment-success",
  "qr-code",
  "scan-qr",
  "ticket-detail",
  "wallet",
]);

const BLOCKED_PRODUCT_EVENT_SEGMENTS = new Set(["cart", "checkout", "wallet"]);

const BLOCKED_PLAN_SCREEN_SEGMENTS = new Set([
  "map-selection",
  "view-location",
]);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const positionsMatch = (
  left: { x: number; y: number },
  right: { x: number; y: number },
) => Math.abs(left.x - right.x) < 0.5 && Math.abs(left.y - right.y) < 0.5;

const getRect = (x: number, y: number, size: number) => ({
  left: x,
  right: x + size,
  top: y,
  bottom: y + size,
});

const rectsOverlap = (
  left: { left: number; right: number; top: number; bottom: number },
  right: { left: number; right: number; top: number; bottom: number },
) =>
  left.left < right.right &&
  left.right > right.left &&
  left.top < right.bottom &&
  left.bottom > right.top;

const getDeleteZoneRect = (
  width: number,
  height: number,
  bottomInset: number,
) => {
  const centerX = width / 2;
  const bottom = Math.max(bottomInset + 16, 24);
  const centerY = height - bottom - DELETE_ZONE_SIZE / 2;
  const halfSize = DELETE_ZONE_SIZE / 2;

  return {
    left: centerX - halfSize,
    right: centerX + halfSize,
    top: centerY - halfSize,
    bottom: centerY + halfSize,
  };
};

const getNearestHorizontalEdge = (
  position: { x: number },
  width: number,
): "left" | "right" =>
  position.x + BUTTON_SIZE / 2 < width / 2 ? "left" : "right";

const isOverDeleteZone = (
  x: number,
  y: number,
  width: number,
  height: number,
  bottomInset: number,
) => {
  const shortcutRect = getRect(x, y, BUTTON_SIZE);
  const deleteZoneRect = getDeleteZoneRect(width, height, bottomInset);

  return rectsOverlap(shortcutRect, deleteZoneRect);
};

const isPointInsideDeleteZone = (
  pointX: number,
  pointY: number,
  width: number,
  height: number,
  bottomInset: number,
) => {
  const zone = getDeleteZoneRect(width, height, bottomInset);

  return (
    pointX >= zone.left &&
    pointX <= zone.right &&
    pointY >= zone.top &&
    pointY <= zone.bottom
  );
};

export default function TicketWalletShortcut() {
  const router = useRouter();
  const segments = useSegments();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRestoredAuth = useAuthStore((state) => state.hasRestored);
  const isHydrated = useTicketWalletShortcutStore((state) => state.isHydrated);
  const isVisible = useTicketWalletShortcutStore((state) => state.isVisible);
  const storedPosition = useTicketWalletShortcutStore(
    (state) => state.position,
  );
  const hydrate = useTicketWalletShortcutStore((state) => state.hydrate);
  const removeShortcut = useTicketWalletShortcutStore((state) => state.remove);
  const setStoredPosition = useTicketWalletShortcutStore(
    (state) => state.setPosition,
  );
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDismiss, setIsOverDismiss] = useState(false);
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const animatedPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const deleteAnimation = useRef(new Animated.Value(1)).current;
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const hasPlacedInitialPositionRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isOverDismissRef = useRef(false);
  const isDeleteInProgressRef = useRef(false);
  const keyboardHeightRef = useRef(0);
  const edgeSideRef = useRef<"left" | "right">("right");
  const navigationLockedRef = useRef(false);
  const navigationUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const preKeyboardPositionRef = useRef<{ x: number; y: number } | null>(null);
  const pendingKeyboardRestoreRef = useRef(false);
  const draggedDuringKeyboardRef = useRef(false);

  const firstSegment = segments[0];
  const secondSegment = segments[1];
  const thirdSegment = segments[2];
  const routeKey = segments.join("/");
  const isTicketWalletRoute =
    firstSegment === "event-screen" && secondSegment === "wallet";
  const isBlockedRoute =
    !firstSegment ||
    BLOCKED_ROOT_SEGMENTS.has(firstSegment) ||
    (firstSegment === "event-screen" &&
      (BLOCKED_EVENT_SCREEN_SEGMENTS.has(secondSegment ?? "") ||
        (secondSegment === "product" &&
          BLOCKED_PRODUCT_EVENT_SEGMENTS.has(thirdSegment ?? "")))) ||
    (firstSegment === "plan-screen" &&
      BLOCKED_PLAN_SCREEN_SEGMENTS.has(secondSegment ?? ""));
  const shouldRender =
    Platform.OS !== "web" &&
    hasRestoredAuth &&
    isAuthenticated &&
    !isBlockedRoute;

  const bounds = useMemo(() => {
    const bottomClearance =
      keyboardHeight > 0
        ? keyboardHeight + EDGE_GAP
        : BOTTOM_TAB_CLEARANCE + insets.bottom;

    return {
      minX: EDGE_GAP,
      maxX: Math.max(EDGE_GAP, width - BUTTON_SIZE - EDGE_GAP),
      minY: Math.max(EDGE_GAP, insets.top + TOP_UI_CLEARANCE),
      maxY: Math.max(
        insets.top + TOP_UI_CLEARANCE,
        height - BUTTON_SIZE - bottomClearance,
      ),
      dismissBottomInset:
        keyboardHeight > 0 ? keyboardHeight + insets.bottom : insets.bottom,
    };
  }, [height, insets.bottom, insets.top, keyboardHeight, width]);

  const clampPosition = useCallback(
    (position: { x: number; y: number }) => ({
      x: clamp(position.x, bounds.minX, bounds.maxX),
      y: clamp(position.y, bounds.minY, bounds.maxY),
    }),
    [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY],
  );

  const syncAnimatedPosition = useCallback(
    (position: { x: number; y: number }, animated = false) => {
      const nextPosition = clampPosition(position);
      lastPositionRef.current = nextPosition;

      if (animated) {
        animatedPosition.stopAnimation();
        Animated.timing(animatedPosition, {
          toValue: nextPosition,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      } else {
        animatedPosition.stopAnimation();
        animatedPosition.setValue(nextPosition);
      }

      return nextPosition;
    },
    [animatedPosition, clampPosition],
  );

  const persistPosition = useCallback(
    (position: { x: number; y: number }) => {
      void setStoredPosition(position).catch(() => undefined);
    },
    [setStoredPosition],
  );

  const refreshActiveTicketCount = useCallback(async () => {
    const walletTickets = await getMyTicketWallet();
    setActiveTicketCount(getActiveTicketWalletCount(walletTickets));
  }, []);

  const clearDragState = useCallback(() => {
    isDraggingRef.current = false;
    isOverDismissRef.current = false;
    setIsDragging(false);
    setIsOverDismiss(false);
  }, []);

  const animateDeleteAndHide = useCallback(() => {
    if (isDeleteInProgressRef.current) {
      return;
    }

    isDeleteInProgressRef.current = true;
    clearDragState();

    Animated.parallel([
      Animated.timing(deleteAnimation, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(animatedPosition, {
        toValue: {
          x: width / 2 - BUTTON_SIZE / 2,
          y:
            height -
            Math.max(bounds.dismissBottomInset + 36, 60) -
            BUTTON_SIZE / 2,
        },
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      void removeShortcut()
        .catch(() => undefined)
        .finally(() => {
          isDeleteInProgressRef.current = false;
        });
    });
  }, [
    animatedPosition,
    bounds.dismissBottomInset,
    clearDragState,
    deleteAnimation,
    removeShortcut,
    height,
    width,
  ]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hasRestoredAuth || !isAuthenticated) {
      setActiveTicketCount(0);
      return;
    }

    void refreshActiveTicketCount().catch(() => undefined);
  }, [hasRestoredAuth, isAuthenticated, refreshActiveTicketCount, routeKey]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      TICKET_WALLET_CHANGED_EVENT,
      (event?: TicketWalletChangedEvent) => {
        if (!hasRestoredAuth || !isAuthenticated) {
          setActiveTicketCount(0);
          return;
        }

        if (typeof event?.activeTicketCount === "number") {
          setActiveTicketCount(event.activeTicketCount);
          return;
        }

        void refreshActiveTicketCount().catch(() => undefined);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [hasRestoredAuth, isAuthenticated, refreshActiveTicketCount]);

  useEffect(() => {
    if (!isVisible) {
      hasPlacedInitialPositionRef.current = false;
      edgeSideRef.current = "right";
      preKeyboardPositionRef.current = null;
      pendingKeyboardRestoreRef.current = false;
      return;
    }

    isDeleteInProgressRef.current = false;
    clearDragState();
    deleteAnimation.stopAnimation();
    deleteAnimation.setValue(1);
  }, [clearDragState, deleteAnimation, isVisible]);

  useEffect(() => {
    if (!isTicketWalletRoute) {
      navigationLockedRef.current = false;
    }
  }, [isTicketWalletRoute]);

  useEffect(
    () => () => {
      animatedPosition.stopAnimation();

      if (navigationUnlockTimerRef.current) {
        clearTimeout(navigationUnlockTimerRef.current);
      }
    },
    [animatedPosition],
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        if (keyboardHeightRef.current === 0) {
          preKeyboardPositionRef.current = lastPositionRef.current;
          draggedDuringKeyboardRef.current = false;
        }

        keyboardHeightRef.current = event.endCoordinates.height;
        setKeyboardHeight(event.endCoordinates.height);
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHeightRef.current = 0;
      pendingKeyboardRestoreRef.current = true;
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !isVisible || width <= 0 || height <= 0) {
      return;
    }

    const fallback = {
      x: width - BUTTON_SIZE - DEFAULT_RIGHT,
      y: height * DEFAULT_TOP_RATIO,
    };
    const keyboardRestorePosition =
      pendingKeyboardRestoreRef.current && !draggedDuringKeyboardRef.current
        ? preKeyboardPositionRef.current
        : null;
    const desiredPosition =
      keyboardRestorePosition ??
      (hasPlacedInitialPositionRef.current
        ? lastPositionRef.current
        : (storedPosition ?? fallback));
    const edgeAdjustedPosition =
      hasPlacedInitialPositionRef.current && keyboardHeight === 0
        ? {
            ...desiredPosition,
            x: edgeSideRef.current === "left" ? bounds.minX : bounds.maxX,
          }
        : desiredPosition;
    const nextPosition = syncAnimatedPosition(
      edgeAdjustedPosition,
      hasPlacedInitialPositionRef.current,
    );

    hasPlacedInitialPositionRef.current = true;
    edgeSideRef.current = getNearestHorizontalEdge(nextPosition, width);
    setIsPositionReady(true);
    pendingKeyboardRestoreRef.current = false;
    preKeyboardPositionRef.current = null;

    if (
      keyboardHeight === 0 &&
      (!storedPosition || !positionsMatch(nextPosition, edgeAdjustedPosition))
    ) {
      persistPosition(nextPosition);
    }
  }, [
    bounds.maxX,
    bounds.minX,
    height,
    isHydrated,
    keyboardHeight,
    persistPosition,
    isVisible,
    storedPosition,
    syncAnimatedPosition,
    width,
  ]);

  const snapToEdge = useCallback(
    (position: { x: number; y: number }) => {
      const centeredX = position.x + BUTTON_SIZE / 2;
      const edgeX = centeredX < width / 2 ? bounds.minX : bounds.maxX;
      edgeSideRef.current = centeredX < width / 2 ? "left" : "right";

      return syncAnimatedPosition({ x: edgeX, y: position.y }, true);
    },
    [bounds.maxX, bounds.minX, syncAnimatedPosition, width],
  );

  const handleOpenWallet = useCallback(() => {
    if (isTicketWalletRoute || navigationLockedRef.current) {
      return;
    }

    navigationLockedRef.current = true;
    router.push("/event-screen/wallet");

    if (navigationUnlockTimerRef.current) {
      clearTimeout(navigationUnlockTimerRef.current);
    }

    navigationUnlockTimerRef.current = setTimeout(() => {
      navigationLockedRef.current = false;
    }, NAVIGATION_LOCK_MS);
  }, [isTicketWalletRoute, router]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > TAP_SLOP ||
          Math.abs(gestureState.dy) > TAP_SLOP,
        onPanResponderGrant: () => {
          animatedPosition.stopAnimation();
          dragStartRef.current = lastPositionRef.current;
          deleteAnimation.setValue(1);
        },
        onPanResponderMove: (_, gestureState) => {
          const nextPosition = clampPosition({
            x: dragStartRef.current.x + gestureState.dx,
            y: dragStartRef.current.y + gestureState.dy,
          });

          if (
            !isDraggingRef.current &&
            (Math.abs(gestureState.dx) > TAP_SLOP ||
              Math.abs(gestureState.dy) > TAP_SLOP)
          ) {
            isDraggingRef.current = true;
            setIsDragging(true);
          }

          if (keyboardHeightRef.current > 0) {
            draggedDuringKeyboardRef.current = true;
          }

          if (isDraggingRef.current) {
            const overDismiss = isOverDeleteZone(
              nextPosition.x,
              nextPosition.y,
              width,
              height,
              bounds.dismissBottomInset,
            );

            if (overDismiss !== isOverDismissRef.current) {
              isOverDismissRef.current = overDismiss;
              setIsOverDismiss(overDismiss);
            }
          }

          lastPositionRef.current = nextPosition;
          animatedPosition.setValue(nextPosition);
        },
        onPanResponderRelease: (_, gestureState) => {
          const releasePosition = {
            x: gestureState.moveX - BUTTON_SIZE / 2,
            y: gestureState.moveY - BUTTON_SIZE / 2,
          };
          const nextPosition = clampPosition(releasePosition);
          const didDrag =
            Math.abs(gestureState.dx) > TAP_SLOP ||
            Math.abs(gestureState.dy) > TAP_SLOP;

          if (!didDrag) {
            clearDragState();
            handleOpenWallet();
            return;
          }

          const releasedOnDeleteZone =
            isPointInsideDeleteZone(
              gestureState.moveX,
              gestureState.moveY,
              width,
              height,
              bounds.dismissBottomInset,
            ) ||
            isOverDeleteZone(
              nextPosition.x,
              nextPosition.y,
              width,
              height,
              bounds.dismissBottomInset,
            );

          if (releasedOnDeleteZone) {
            animateDeleteAndHide();
            return;
          }

          clearDragState();
          const snappedPosition = snapToEdge(nextPosition);
          persistPosition(snappedPosition);
        },
        onPanResponderTerminate: () => {
          if (isDeleteInProgressRef.current) {
            return;
          }

          clearDragState();
          const snappedPosition = snapToEdge(lastPositionRef.current);
          persistPosition(snappedPosition);
        },
      }),
    [
      deleteAnimation,
      animatedPosition,
      bounds.dismissBottomInset,
      clampPosition,
      clearDragState,
      animateDeleteAndHide,
      handleOpenWallet,
      height,
      persistPosition,
      snapToEdge,
      width,
    ],
  );

  if (!shouldRender || !isHydrated || !isVisible || !isPositionReady) {
    return null;
  }

  const badgeLabel = activeTicketCount > 99 ? "99+" : String(activeTicketCount);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {isDragging && (
        <View
          pointerEvents="none"
          style={[
            styles.dismissTarget,
            {
              bottom: Math.max(bounds.dismissBottomInset + 16, 24),
              zIndex: 999,
              elevation: 10,
              backgroundColor: isOverDismiss
                ? "rgba(220, 38, 38, 0.42)"
                : "rgba(220, 38, 38, 0.18)",
            },
          ]}
        >
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={24}
            color={isDark ? "#FFFFFF" : "#111111"}
          />
        </View>
      )}
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.shortcut,
          isDragging && styles.shortcutDragging,
          {
            transform: [
              ...animatedPosition.getTranslateTransform(),
              { scale: deleteAnimation },
            ],
            backgroundColor: isDark
              ? "rgba(17, 17, 17, 0.82)"
              : "rgba(17, 17, 17, 0.7)",
            opacity: isOverDismiss ? 0.1 : 1,
          },
        ]}
        {...panResponder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel="Open Ticket Wallet"
        accessibilityHint="Opens your Ticket Wallet. Drag to move the shortcut, or drag to the dismiss area to hide it."
        onAccessibilityTap={handleOpenWallet}
      >
        {/* Target icon to delete */}
        <HugeiconsIcon
          icon={Ticket02Icon}
          size={ICON_SIZE}
          color="#B3B3B3"
          strokeWidth={2}
        />
        {activeTicketCount > 0 && (
          <View pointerEvents="none" style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{badgeLabel}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shortcut: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 999,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1001,
    elevation: 13,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  shortcutDragging: {
    opacity: 0.92,
  },
  dismissTarget: {
    position: "absolute",
    left: "50%",
    width: DELETE_ZONE_SIZE,
    height: DELETE_ZONE_SIZE,
    marginLeft: -DELETE_ZONE_SIZE / 2,
    borderRadius: DELETE_ZONE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 10,
  },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E75737",
    borderWidth: 2,
    borderColor: "#101014",
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
  },
});
