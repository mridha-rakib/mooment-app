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

export default function CreateEventStep4() {
  const router = useRouter();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity>
          <Text style={styles.saveDraft}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Steps */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Step 4</Text>
        <Text style={styles.stepText}>4 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {/* Create Ticket Button */}
        <TouchableOpacity 
          style={styles.createTicketButton}
          onPress={() => router.push('/create-event/ticket-details')}
        >
          <Ionicons name="add" size={20} color="#0e0d12" style={{ marginRight: 8 }} />
          <Text style={styles.createTicketText}>Create Ticket</Text>
        </TouchableOpacity>

        {/* Ticket Card */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketTitleContainer}>
              <Text style={styles.ticketTitle}>General Ticket</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>42 left</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Feather name="edit-3" size={18} color="#8E8E9B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.ticketDescription}>Entry from 9pm. Standing only.</Text>
          <Text style={styles.ticketExpiry}>Expires in • Sat, Sep 9 • 4:00 PM</Text>

          <View style={styles.ticketFooter}>
            <View>
              <Text style={styles.ticketPrice}>£45</Text>
              <Text style={styles.perTicket}>per ticket</Text>
            </View>
            <TouchableOpacity onPress={() => setIsDeleteModalVisible(true)}>
              <Ionicons name="trash-outline" size={18} color="#8E8E9B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => router.push('/create-event/step-5')}
        >
          <Text style={styles.nextButtonText}>Next</Text>
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
    backgroundColor: '#0e0d12',
    paddingTop: 45,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: 20,
  },
  saveDraft: {
    color: '#AFA9EC',
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
    color: '#8E8E9B',
    fontSize: 13,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  createTicketButton: {
    backgroundColor: '#A29CB5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  createTicketText: {
    color: '#0e0d12',
    fontSize: 15,
    fontWeight: '600',
  },
  ticketCard: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A32',
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
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#3F3F46',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#D1D1D6',
    fontSize: 11,
    fontWeight: '500',
  },
  ticketDescription: {
    color: '#8E8E9B',
    fontSize: 13,
    marginBottom: 4,
  },
  ticketExpiry: {
    color: '#8E8E9B',
    fontSize: 12,
    marginBottom: 16,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ticketPrice: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
  },
  perTicket: {
    color: '#8E8E9B',
    fontSize: 11,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 16,
  },
  nextButton: {
    backgroundColor: '#A29CB5',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: '600',
  },
});
