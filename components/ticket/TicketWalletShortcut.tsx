import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useTicketWalletShortcutStore } from "@/stores/ticketWalletShortcutStore";
import { Cancel01Icon, Ticket02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter, useSegments } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  Platform,
  StyleSheet,
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
const TAP_SLOP = 7;
const NAVIGATION_LOCK_MS = 700;

const BLOCKED_ROOT_SEGMENTS = new Set(["auth-screen", "create-event", "error", "live-screen", "post-screen"]);

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

const BLOCKED_PLAN_SCREEN_SEGMENTS = new Set(["map-selection", "view-location"]);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const positionsMatch = (left: { x: number; y: number }, right: { x: number; y: number }) =>
  Math.abs(left.x - right.x) < 0.5 && Math.abs(left.y - right.y) < 0.5;

const getNearestHorizontalEdge = (position: { x: number }, width: number): "left" | "right" =>
  position.x + BUTTON_SIZE / 2 < width / 2 ? "left" : "right";

const isNearDismissTarget = (x: number, y: number, width: number, height: number, bottomInset: number) => {
  const centerX = x + BUTTON_SIZE / 2;
  const centerY = y + BUTTON_SIZE / 2;
  const targetX = width / 2;
  const targetY = height - Math.max(bottomInset + 36, 60);
  const distance = Math.hypot(centerX - targetX, centerY - targetY);

  return distance <= DISMISS_SIZE / 2 + BUTTON_SIZE / 2;
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
  const storedPosition = useTicketWalletShortcutStore((state) => state.position);
  const hydrate = useTicketWalletShortcutStore((state) => state.hydrate);
  const hide = useTicketWalletShortcutStore((state) => state.hide);
  const setStoredPosition = useTicketWalletShortcutStore((state) => state.setPosition);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPositionReady, setIsPositionReady] = useState(false);
  const animatedPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const hasPlacedInitialPositionRef = useRef(false);
  const isDraggingRef = useRef(false);
  const keyboardHeightRef = useRef(0);
  const edgeSideRef = useRef<"left" | "right">("right");
  const navigationLockedRef = useRef(false);
  const navigationUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preKeyboardPositionRef = useRef<{ x: number; y: number } | null>(null);
  const pendingKeyboardRestoreRef = useRef(false);
  const draggedDuringKeyboardRef = useRef(false);

  const firstSegment = segments[0];
  const secondSegment = segments[1];
  const thirdSegment = segments[2];
  const isTicketWalletRoute = firstSegment === "event-screen" && secondSegment === "wallet";
  const isBlockedRoute =
    !firstSegment ||
    BLOCKED_ROOT_SEGMENTS.has(firstSegment) ||
    (firstSegment === "event-screen" &&
      (BLOCKED_EVENT_SCREEN_SEGMENTS.has(secondSegment ?? "") ||
        (secondSegment === "product" && BLOCKED_PRODUCT_EVENT_SEGMENTS.has(thirdSegment ?? "")))) ||
    (firstSegment === "plan-screen" && BLOCKED_PLAN_SCREEN_SEGMENTS.has(secondSegment ?? ""));
  const shouldRender =
    Platform.OS !== "web" &&
    hasRestoredAuth &&
    isAuthenticated &&
    !isBlockedRoute;

  const bounds = useMemo(() => {
    const bottomClearance = keyboardHeight > 0 ? keyboardHeight + EDGE_GAP : BOTTOM_TAB_CLEARANCE + insets.bottom;

    return {
      minX: EDGE_GAP,
      maxX: Math.max(EDGE_GAP, width - BUTTON_SIZE - EDGE_GAP),
      minY: Math.max(EDGE_GAP, insets.top + TOP_UI_CLEARANCE),
      maxY: Math.max(insets.top + TOP_UI_CLEARANCE, height - BUTTON_SIZE - bottomClearance),
      dismissBottomInset: keyboardHeight > 0 ? keyboardHeight + insets.bottom : insets.bottom,
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

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      if (keyboardHeightRef.current === 0) {
        preKeyboardPositionRef.current = lastPositionRef.current;
        draggedDuringKeyboardRef.current = false;
      }

      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardHeight(event.endCoordinates.height);
    });
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
    if (!isHydrated || width <= 0 || height <= 0) {
      return;
    }

    const fallback = {
      x: width - BUTTON_SIZE - DEFAULT_RIGHT,
      y: height * DEFAULT_TOP_RATIO,
    };
    const keyboardRestorePosition =
      pendingKeyboardRestoreRef.current && !draggedDuringKeyboardRef.current ? preKeyboardPositionRef.current : null;
    const desiredPosition =
      keyboardRestorePosition ??
      (hasPlacedInitialPositionRef.current ? lastPositionRef.current : storedPosition ?? fallback);
    const edgeAdjustedPosition =
      hasPlacedInitialPositionRef.current && keyboardHeight === 0
        ? {
            ...desiredPosition,
            x: edgeSideRef.current === "left" ? bounds.minX : bounds.maxX,
          }
        : desiredPosition;
    const nextPosition = syncAnimatedPosition(edgeAdjustedPosition, hasPlacedInitialPositionRef.current);

    hasPlacedInitialPositionRef.current = true;
    edgeSideRef.current = getNearestHorizontalEdge(nextPosition, width);
    setIsPositionReady(true);
    pendingKeyboardRestoreRef.current = false;
    preKeyboardPositionRef.current = null;

    if (keyboardHeight === 0 && (!storedPosition || !positionsMatch(nextPosition, edgeAdjustedPosition))) {
      persistPosition(nextPosition);
    }
  }, [bounds.maxX, bounds.minX, height, isHydrated, keyboardHeight, persistPosition, storedPosition, syncAnimatedPosition, width]);

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

  const handleHide = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    void hide().catch(() => undefined);
  }, [hide]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > TAP_SLOP || Math.abs(gestureState.dy) > TAP_SLOP,
        onPanResponderGrant: () => {
          animatedPosition.stopAnimation();
          dragStartRef.current = lastPositionRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextPosition = clampPosition({
            x: dragStartRef.current.x + gestureState.dx,
            y: dragStartRef.current.y + gestureState.dy,
          });

          if (!isDraggingRef.current && (Math.abs(gestureState.dx) > TAP_SLOP || Math.abs(gestureState.dy) > TAP_SLOP)) {
            isDraggingRef.current = true;
            setIsDragging(true);
          }

          if (keyboardHeightRef.current > 0) {
            draggedDuringKeyboardRef.current = true;
          }

          lastPositionRef.current = nextPosition;
          animatedPosition.setValue(nextPosition);
        },
        onPanResponderRelease: (_, gestureState) => {
          const nextPosition = clampPosition({
            x: dragStartRef.current.x + gestureState.dx,
            y: dragStartRef.current.y + gestureState.dy,
          });
          const didDrag = Math.abs(gestureState.dx) > TAP_SLOP || Math.abs(gestureState.dy) > TAP_SLOP;

          isDraggingRef.current = false;
          setIsDragging(false);

          if (!didDrag) {
            handleOpenWallet();
            return;
          }

          if (isNearDismissTarget(nextPosition.x, nextPosition.y, width, height, bounds.dismissBottomInset)) {
            handleHide();
            return;
          }

          const snappedPosition = snapToEdge(nextPosition);
          persistPosition(snappedPosition);
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          setIsDragging(false);
          const snappedPosition = snapToEdge(lastPositionRef.current);
          persistPosition(snappedPosition);
        },
      }),
    [
      animatedPosition,
      bounds.dismissBottomInset,
      clampPosition,
      handleHide,
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

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {isDragging && (
        <View
          pointerEvents="none"
          style={[
            styles.dismissTarget,
            {
              bottom: Math.max(bounds.dismissBottomInset + 16, 24),
              backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(17,17,17,0.12)",
            },
          ]}
        >
          <HugeiconsIcon icon={Cancel01Icon} size={24} color={isDark ? "#FFFFFF" : "#111111"} />
        </View>
      )}
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.shortcut,
          {
            transform: animatedPosition.getTranslateTransform(),
            backgroundColor: isDark ? "rgba(17, 17, 17, 0.82)" : "rgba(17, 17, 17, 0.7)",
          },
          isDragging && styles.shortcutDragging,
        ]}
        {...panResponder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel="Open Ticket Wallet"
        accessibilityHint="Opens your Ticket Wallet. Drag to move the shortcut, or drag to the dismiss area to hide it."
        onAccessibilityTap={handleOpenWallet}
      >
        <HugeiconsIcon icon={Ticket02Icon} size={ICON_SIZE} color="#B3B3B3" strokeWidth={2} />
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
    zIndex: 1000,
    elevation: 12,
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
    width: DISMISS_SIZE,
    height: DISMISS_SIZE,
    marginLeft: -DISMISS_SIZE / 2,
    borderRadius: DISMISS_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
