import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder } from 'react-native';

type UseBottomSheetDragDismissOptions = {
  visible: boolean;
  onClose: () => void | Promise<void>;
  canStartContentDrag?: () => boolean;
};

const MAX_UPWARD_DRAG = -72;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.9;
const DISMISS_TRANSLATE_Y = 360;

export function useBottomSheetDragDismiss({
  visible,
  onClose,
  canStartContentDrag,
}: UseBottomSheetDragDismissOptions) {
  const translateY = useRef(new Animated.Value(0)).current;
  const closingFromDragRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const canStartContentDragRef = useRef(canStartContentDrag);

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
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_event, gesture) => {
          const canStart = canStartContentDragRef.current?.() ?? false;

          return canStart && gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
        },
        ...responderCallbacks,
      }),
    [responderCallbacks],
  );

  return {
    sheetTranslateY,
    dragPanHandlers: dragResponder.panHandlers,
    contentPanHandlers: contentResponder.panHandlers,
    resetSheetPosition: () => translateY.setValue(0),
  };
}
