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
import { BlurView } from 'expo-blur';

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
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={styles.sheet}>
          <View style={styles.handle} />
          
          <Text style={styles.title}>Why are you reporting this?</Text>
          
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
                  selectedReason === reason && styles.selectedReasonText
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.continueBtn, 
                !selectedReason && styles.continueBtnDisabled
              ]} 
              onPress={handleContinue}
              disabled={!selectedReason}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#13131A',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
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
    color: '#8E8E9B',
    fontSize: 15,
    fontWeight: '500',
  },
  selectedReasonText: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  continueBtn: {
    flex: 2,
    height: 54,
    backgroundColor: '#B59EBE',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: '#13131A',
    fontSize: 16,
    fontWeight: '700',
  },
});
