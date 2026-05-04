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
        <View style={styles.modalCard}>
          {/* Alert Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="alert-outline" size={32} color="#FFF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.noButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.noButtonText}>No</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.yesButton} 
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.yesButtonText}>Yes</Text>
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
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C21515', // Red background from image
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'left', // Aligned left in image
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
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  noButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  yesButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  yesButtonText: {
    color: '#C21515', // Red text for Yes
    fontSize: 16,
    fontWeight: '600',
  },
});
