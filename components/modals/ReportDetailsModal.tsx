import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
interface ReportDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onDone: (details: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function ReportDetailsModal({ visible, onClose, onDone, isSubmitting = false }: ReportDetailsModalProps) {
  const [details, setDetails] = useState('');
  const { colors, isDark } = useTheme();

  const handleDone = async () => {
    if (!details.trim() || isSubmitting) {
      return;
    }

    try {
      await onDone(details);
      setDetails('');
      onClose();
    } catch {
      // The caller owns user-facing error feedback and may keep the sheet open.
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }]}>
          <TouchableOpacity 
            style={styles.dismissArea} 
            activeOpacity={1} 
            onPress={onClose} 
          />
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.sheetContainer}
          >
            <View style={[styles.sheet, { backgroundColor: colors.background }]}>
              <View style={[styles.handle, { backgroundColor: colors.text + '33' }]} />
              
              <Text style={[styles.title, { color: colors.text }]}>Write down your report</Text>
              
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Describe the issue (250 character limit)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={250}
                  value={details}
                  onChangeText={setDetails}
                  autoFocus
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.doneBtn, 
                    { backgroundColor: buttonBackground(colors) },
                    (!details.trim() || isSubmitting) && styles.doneBtnDisabled
                  ]} 
                  onPress={handleDone}
                  disabled={!details.trim() || isSubmitting}
                >
                  <Text style={[styles.doneBtnText, { color: buttonForeground(colors) }]}>
                    {isSubmitting ? 'Submitting...' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
  sheetContainer: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
    marginBottom: 24,
  },
  inputContainer: {
    borderRadius: 16,
    height: 200,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  input: {
    fontSize: 15,
    textAlignVertical: 'top',
    height: '100%',
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
  doneBtn: {
    flex: 1.5,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnDisabled: {
    opacity: 0.5,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
