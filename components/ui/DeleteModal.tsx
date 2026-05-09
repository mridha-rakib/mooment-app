import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
}

export default function DeleteModal({
  visible,
  onClose,
  onConfirm,
  title = "Are you sure you want to delete?",
}: DeleteModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      
      <View style={styles.container}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Alert Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.danger }]}>
            <Ionicons name="alert-outline" size={32} color={colors.background} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.noButton, { backgroundColor: colors.background, borderColor: colors.border }]} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.noButtonText, { color: colors.text }]}>No</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.yesButton, { backgroundColor: colors.background, borderColor: colors.border }]} 
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={[styles.yesButtonText, { color: colors.danger }]}>Yes</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'left',
    width: '100%',
    lineHeight: 32,
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 12,
  },
  noButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  yesButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
  },
  yesButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
