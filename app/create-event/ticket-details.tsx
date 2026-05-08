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

export default function TicketDetailsScreen() {
  const router = useRouter();
  const [ticketType, setTicketType] = useState('Free'); // 'Free' or 'Pay'
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleConfirm = () => {
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Success Animation */}
      <ConfettiOverlay 
        visible={showConfetti} 
        onFinish={() => setShowConfetti(false)} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton iconName="x" size={24} />
        <Text style={styles.headerTitle}>Set Ticket Details</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Ticket Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TICKET NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#8E8E9B"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={styles.input}
            placeholder="Detail about ticket"
            placeholderTextColor="#8E8E9B"
          />
        </View>

        {/* Date and Time Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>END DATE</Text>
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#8E8E9B" style={{ marginRight: 8 }} />
              <Text style={styles.selectorText}>{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>END TIME</Text>
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color="#8E8E9B" style={{ marginRight: 8 }} />
              <Text style={styles.selectorText}>{formatTime(date)}</Text>
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
            <View style={[styles.radioOuter, ticketType === 'Free' && styles.radioOuterActive]}>
              {ticketType === 'Free' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>Free</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.radioItem} 
            onPress={() => setTicketType('Pay')}
          >
            <View style={[styles.radioOuter, ticketType === 'Pay' && styles.radioOuterActive]}>
              {ticketType === 'Pay' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>Pay</Text>
          </TouchableOpacity>
        </View>

        {/* Capacity */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CAPACITY</Text>
          <TextInput
            style={styles.input}
            placeholder="185"
            placeholderTextColor="#8E8E9B"
            keyboardType="numeric"
            defaultValue="185"
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0d12',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
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
    color: '#8E8E9B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    color: '#FFF',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selector: {
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorText: {
    color: '#FFF',
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
    borderColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#FFF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
  },
  radioLabel: {
    color: '#FFF',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    backgroundColor: '#0e0d12',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1A1A22',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#A29CB5',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: '600',
  },
});
