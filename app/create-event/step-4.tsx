import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DeleteModal from '../../components/ui/DeleteModal';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';

export default function CreateEventStep4() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Event</Text>
        <TouchableOpacity>
          <Text style={[styles.saveDraft, { color: colors.primary }]}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Steps */}
      <View style={styles.stepContainer}>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 4</Text>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>4 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {/* Create Ticket Button */}
        <TouchableOpacity 
          style={[styles.createTicketButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/create-event/ticket-details')}
        >
          <Ionicons name="add" size={20} color={colors.background} style={{ marginRight: 8 }} />
          <Text style={[styles.createTicketText, { color: colors.background }]}>Create Ticket</Text>
        </TouchableOpacity>

        {/* Ticket Card */}
        <View style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketTitleContainer}>
              <Text style={[styles.ticketTitle, { color: colors.text }]}>General Ticket</Text>
              <View style={[styles.badge, { backgroundColor: isDark ? '#3F3F46' : '#E5E5EA' }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>42 left</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Feather name="edit-3" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.ticketDescription, { color: colors.textSecondary }]}>Entry from 9pm. Standing only.</Text>
          <Text style={[styles.ticketExpiry, { color: colors.textSecondary }]}>Expires in • Sat, Sep 9 • 4:00 PM</Text>

          <View style={styles.ticketFooter}>
            <View>
              <Text style={[styles.ticketPrice, { color: colors.text }]}>£45</Text>
              <Text style={[styles.perTicket, { color: colors.textSecondary }]}>per ticket</Text>
            </View>
            <TouchableOpacity onPress={() => setIsDeleteModalVisible(true)}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/create-event/step-5')}
        >
          <Text style={[styles.nextButtonText, { color: colors.background }]}>Next</Text>
        </TouchableOpacity>
      </View>
      <DeleteModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onConfirm={() => {
          setIsDeleteModalVisible(false);
          // Add deletion logic here if needed
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: 20,
  },
  saveDraft: {
    fontSize: 13,
    fontWeight: '500',
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  stepText: {
    fontSize: 13,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  createTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  createTicketText: {
    fontSize: 15,
    fontWeight: '600',
  },
  ticketCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ticketDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  ticketExpiry: {
    fontSize: 12,
    marginBottom: 16,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ticketPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  perTicket: {
    fontSize: 11,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 16,
  },
  nextButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
