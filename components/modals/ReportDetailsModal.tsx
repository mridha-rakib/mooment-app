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

interface ReportDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onDone: (details: string) => void;
}

export default function ReportDetailsModal({ visible, onClose, onDone }: ReportDetailsModalProps) {
  const [details, setDetails] = useState('');

  const handleDone = () => {
    onDone(details);
    setDetails('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableOpacity 
            style={styles.dismissArea} 
            activeOpacity={1} 
            onPress={onClose} 
          />
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.sheetContainer}
          >
            <View style={styles.sheet}>
              <View style={styles.handle} />
              
              <Text style={styles.title}>Write down your report</Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Describe the issue (250 character limit)"
                  placeholderTextColor="#4E4E56"
                  multiline
                  maxLength={250}
                  value={details}
                  onChangeText={setDetails}
                  autoFocus
                />
              </View>

              <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.doneBtn, 
                    !details.trim() && styles.doneBtnDisabled
                  ]} 
                  onPress={handleDone}
                  disabled={!details.trim()}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#13131A',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    backgroundColor: '#1C1C24',
    borderRadius: 16,
    height: 200,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  input: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1.5,
    height: 54,
    backgroundColor: '#B59EBE',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnDisabled: {
    opacity: 0.5,
  },
  doneBtnText: {
    color: '#13131A',
    fontSize: 16,
    fontWeight: '700',
  },
});
