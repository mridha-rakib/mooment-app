import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder } from 'react-native';
import type { GestureResponderEvent } from 'react-native';

type UseBottomSheetDragDismissOptions = {
  visible: boolean;
  onClose: () => void | Promise<void>;
  canStartContentDrag?: () => boolean;
  captureContentDrag?: boolean;
};

const MAX_UPWARD_DRAG = -72;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.9;
const DISMISS_TRANSLATE_Y = 360;

export function useBottomSheetDragDismiss({
  visible,
  onClose,
  canStartContentDrag,
  captureContentDrag = false,
}: UseBottomSheetDragDismissOptions) {
  const translateY = useRef(new Animated.Value(0)).current;
  const closingFromDragRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const canStartContentDragRef = useRef(canStartContentDrag);
  const touchDragRef = useRef<{
    startX: number;
    startY: number;
    lastY: number;
    lastTimestamp: number;
    dragging: boolean;
  } | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    canStartContentDragRef.current = canStartContentDrag;
  }, [canStartContentDrag]);

  useEffect(() => {
    closingFromDragRef.current = false;
    translateY.setValue(0);
  }, [translateY, visible]);

  const sheetTranslateY = useMemo(
    () =>
      translateY.interpolate({
        inputRange: [MAX_UPWARD_DRAG, 0],
        outputRange: [MAX_UPWARD_DRAG, 0],
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
      }),
    [translateY],
  );

  const resetSheet = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [translateY]);

  const finishGesture = useCallback((dy: number, vy: number) => {
    if (closingFromDragRef.current) {
      return;
    }

    const shouldClose = dy > DISMISS_DISTANCE || vy > DISMISS_VELOCITY;

    if (shouldClose) {
      closingFromDragRef.current = true;
      Animated.timing(translateY, {
        toValue: DISMISS_TRANSLATE_Y,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        translateY.setValue(0);
        void onCloseRef.current();
      });
      return;
    }

    resetSheet();
  }, [resetSheet, translateY]);

  const responderCallbacks = useMemo(() => ({
    onPanResponderGrant: () => {
      translateY.stopAnimation(() => {
        translateY.setValue(0);
      });
    },
    onPanResponderMove: (_event: unknown, gesture: { dy: number }) => {
      translateY.setValue(Math.max(MAX_UPWARD_DRAG, gesture.dy));
    },
    onPanResponderRelease: (_event: unknown, gesture: { dy: number; vy: number }) => {
      finishGesture(gesture.dy, gesture.vy);
    },
    onPanResponderTerminate: resetSheet,
  }), [finishGesture, resetSheet, translateY]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 4,
        ...responderCallbacks,
      }),
    [responderCallbacks],
  );

  const contentResponder = useMemo(
    () => {
      const shouldSetContentPanResponder = (_event: unknown, gesture: { dx: number; dy: number }) => {
        const canStart = canStartContentDragRef.current?.() ?? false;

        return canStart && gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
      };

      return PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: captureContentDrag
          ? shouldSetContentPanResponder
          : undefined,
        onMoveShouldSetPanResponderCapture: shouldSetContentPanResponder,
        ...responderCallbacks,
      });
    },
    [captureContentDrag, responderCallbacks],
  );

  const contentTouchHandlers = useMemo(
    () => ({
      onTouchStart: (event: GestureResponderEvent) => {
        if (!(canStartContentDragRef.current?.() ?? false)) {
          touchDragRef.current = null;
          return;
        }

        const { pageX, pageY, timestamp } = event.nativeEvent;
        touchDragRef.current = {
          startX: pageX,
          startY: pageY,
          lastY: pageY,
          lastTimestamp: timestamp,
          dragging: false,
        };
      },
      onTouchMove: (event: GestureResponderEvent) => {
        const touchDrag = touchDragRef.current;

        if (!touchDrag || closingFromDragRef.current) {
          return;
        }

        const { pageX, pageY, timestamp } = event.nativeEvent;
        const dx = pageX - touchDrag.startX;
        const dy = pageY - touchDrag.startY;

        if (!touchDrag.dragging) {
          if (dy <= 4) {
            touchDrag.lastY = pageY;
            touchDrag.lastTimestamp = timestamp;
            return;
          }

          if (Math.abs(dy) <= Math.abs(dx)) {
            touchDragRef.current = null;
            return;
          }

          touchDrag.dragging = true;
          translateY.stopAnimation(() => {
            translateY.setValue(0);
          });
        }

        translateY.setValue(Math.max(MAX_UPWARD_DRAG, dy));
        touchDrag.lastY = pageY;
        touchDrag.lastTimestamp = timestamp;
      },
      onTouchEnd: (event: GestureResponderEvent) => {
        const touchDrag = touchDragRef.current;
        touchDragRef.current = null;

        if (!touchDrag?.dragging || closingFromDragRef.current) {
          return;
        }

        const { pageY, timestamp } = event.nativeEvent;
        const dy = pageY - touchDrag.startY;
        const elapsed = Math.max(1, timestamp - touchDrag.lastTimestamp);
        const vy = (pageY - touchDrag.lastY) / elapsed;

        finishGesture(dy, vy);
      },
      onTouchCancel: () => {
        const touchDrag = touchDragRef.current;
        touchDragRef.current = null;

        if (touchDrag?.dragging && !closingFromDragRef.current) {
          resetSheet();
        }
      },
    }),
    [finishGesture, resetSheet, translateY],
  );

  return {
    sheetTranslateY,
    dragPanHandlers: dragResponder.panHandlers,
    contentPanHandlers: contentResponder.panHandlers,
    contentTouchHandlers,
    resetSheetPosition: () => translateY.setValue(0),
  };
}
