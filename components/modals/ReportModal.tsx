import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onReport: (reason: string) => void;
}

const REASONS = [
  "I just don't like it",
  "Hate or exploitation",
  "Selling or promoting restricted items",
  "Nudity or sexual activity",
  "Violence or dangerous organizations",
  "It's spam",
  "Bullying or harassment",
  "False information",
  "Intellectual property violation",
  "Other"
];

export default function ReportModal({ visible, onClose, onReport }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const sheetBottomPadding = Math.max(24 + insets.bottom, Platform.OS === 'ios' ? 40 : 24);
  const sheetTranslateY = useMemo(
    () =>
      translateY.interpolate({
        inputRange: [-72, 0],
        outputRange: [-72, 0],
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
      }),
    [translateY],
  );

  const closeFromDrag = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 320,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  }, [onClose, translateY]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          translateY.stopAnimation(() => {
            translateY.setValue(0);
          });
        },
        onPanResponderMove: (_event, gesture) => {
          translateY.setValue(Math.max(-72, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          const shouldClose = gesture.dy > 120 || gesture.vy > 0.9;

          if (shouldClose) {
            closeFromDrag();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
      }),
    [closeFromDrag, translateY],
  );

  const handleContinue = () => {
    if (selectedReason) {
      onReport(selectedReason);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }]}>
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: sheetBottomPadding,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View {...dragResponder.panHandlers} style={styles.dragArea}>
            <View style={[styles.handle, { backgroundColor: colors.text + '33' }]} />
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>Why are you reporting this?</Text>
          
          <ScrollView showsVerticalScrollIndicator={false} style={styles.reasonsList}>
            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonItem}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.reasonText,
                  { color: colors.textSecondary },
                  selectedReason === reason && [styles.selectedReasonText, { color: colors.text }]
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.continueBtn, 
                { backgroundColor: buttonBackground(colors) },
                !selectedReason && styles.continueBtnDisabled
              ]} 
              onPress={handleContinue}
              disabled={!selectedReason}
            >
              <Text style={[styles.continueBtnText, { color: buttonForeground(colors) }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    maxHeight: '80%',
  },
  handle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  reasonsList: {
    flexShrink: 1,
    marginBottom: 24,
  },
  reasonItem: {
    paddingVertical: 14,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectedReasonText: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  continueBtn: {
    flex: 2,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
