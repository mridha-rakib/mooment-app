import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

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
        
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.text + '33' }]} />
          
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
                { backgroundColor: colors.primary },
                !selectedReason && styles.continueBtnDisabled
              ]} 
              onPress={handleContinue}
              disabled={!selectedReason}
            >
              <Text style={[styles.continueBtnText, { color: colors.background }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  handle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  reasonsList: {
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
