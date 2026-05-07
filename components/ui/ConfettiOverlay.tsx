import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

interface ConfettiOverlayProps {
  visible: boolean;
  onFinish?: () => void;
  source?: any;
}

const DEFAULT_CONFETTI = { uri: 'https://assets5.lottiefiles.com/packages/lf20_u4yrau.json' };

export default function ConfettiOverlay({ visible, onFinish, source = DEFAULT_CONFETTI }: ConfettiOverlayProps) {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      animationRef.current?.play();
      
      // Auto-hide after 4 seconds if onFinish is provided
      const timer = setTimeout(() => {
        if (onFinish) {
          onFinish();
        }
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <LottieView
        ref={animationRef}
        source={source}
        autoPlay={false}
        loop={false}
        style={styles.lottie}
        onAnimationFinish={onFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  lottie: {
    width: width,
    height: height,
  },
});
