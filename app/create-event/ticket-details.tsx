import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/ui/BackButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { useTheme } from '@/hooks/useTheme';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useEventDraftStore } from '@/stores/eventDraftStore';

export default function TicketDetailsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const upsertTicket = useEventDraftStore((state) => state.upsertTicket);
  const currentTicket = useEventDraftStore((state) => state.tickets[0]);
  const [ticketType, setTicketType] = useState('Free'); // 'Free' or 'Pay'
  const [ticketName, setTicketName] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [capacity, setCapacity] = useState('185');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleConfirm = () => {
    upsertTicket({
      capacity: Number.parseInt(capacity, 10) || 0,
      description: ticketDescription.trim() || currentTicket?.description || 'Entry from 9pm. Standing only.',
      localId: currentTicket?.localId,
      name: ticketName.trim() || currentTicket?.name || 'General Ticket',
      price: ticketType === 'Free' ? 0 : currentTicket?.price ?? 45,
      salesEndAt: date.toISOString(),
      type: ticketType === 'Free' ? 'free' : 'pay',
    });
    setShowConfetti(true);
    // Navigate back after the animation
    setTimeout(() => {
      router.back();
    }, 2500);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Success Animation */}
      <ConfettiOverlay 
        visible={showConfetti} 
        onFinish={() => setShowConfetti(false)} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton iconName={Cancel01Icon} size={24} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Set Ticket Details</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Ticket Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>TICKET NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            onChangeText={setTicketName}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Detail about ticket"
            placeholderTextColor={colors.textSecondary}
            onChangeText={setTicketDescription}
          />
        </View>

        {/* Date and Time Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>END DATE</Text>
            <TouchableOpacity 
              style={[styles.selector, { backgroundColor: colors.card }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectorText, { color: colors.text }]}>{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>END TIME</Text>
            <TouchableOpacity 
              style={[styles.selector, { backgroundColor: colors.card }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectorText, { color: colors.text }]}>{formatTime(date)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            onChange={onTimeChange}
          />
        )}

        {/* Ticket Type (Free/Pay) */}
        <View style={styles.radioRow}>
          <TouchableOpacity 
            style={styles.radioItem} 
            onPress={() => setTicketType('Free')}
          >
            <View style={[styles.radioOuter, { borderColor: colors.border }, ticketType === 'Free' && { borderColor: colors.primary }]}>
              {ticketType === 'Free' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.radioLabel, { color: colors.text }]}>Free</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.radioItem} 
            onPress={() => setTicketType('Pay')}
          >
            <View style={[styles.radioOuter, { borderColor: colors.border }, ticketType === 'Pay' && { borderColor: colors.primary }]}>
              {ticketType === 'Pay' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.radioLabel, { color: colors.text }]}>Pay</Text>
          </TouchableOpacity>
        </View>

        {/* Capacity */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CAPACITY</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="185"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            defaultValue="185"
            onChangeText={setCapacity}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
          onPress={handleConfirm}
        >
          <Text style={[styles.confirmButtonText, { color: colors.background }]}>Confirm</Text>
        </TouchableOpacity>
      </View>
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selector: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: 15,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
