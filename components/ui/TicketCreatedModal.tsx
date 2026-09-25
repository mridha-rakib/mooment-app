import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { buttonBackground, buttonForeground } from '@/lib/buttonTheme';

// EVT-015 — compact post-create confirmation shown on Step 4 immediately
// after a brand-new ticket tier saves successfully. Mirrors DeleteModal's
// existing Modal/overlay/card structure so it stays visually consistent with
// the rest of Create Event, rather than introducing a new dialog system.
interface TicketCreatedModalProps {
  visible: boolean;
  onCreateAnother: () => void;
  onContinue: () => void;
}

export default function TicketCreatedModal({
  visible,
  onCreateAnother,
  onContinue,
}: TicketCreatedModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
    >
      <View style={styles.overlay} />

      <View style={styles.container}>
        <View
          style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="alert"
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={32} color={buttonForeground(colors)} />
          </View>

          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Ticket created
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: buttonBackground(colors) }]}
            onPress={onCreateAnother}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create another ticket"
          >
            <Text style={[styles.primaryButtonText, { color: buttonForeground(colors) }]}>
              Create another ticket
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onContinue}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Continue</Text>
          </TouchableOpacity>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
