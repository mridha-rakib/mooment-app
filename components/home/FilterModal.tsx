import LocationSearchModal from '@/components/post/LocationSearchModal';
import {
  useTheme } from '@/hooks/useTheme';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React,
  { useRef,
  useState } from 'react';
import { Modal,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
};

const AGE_OPTIONS = ['All Ages', '18+', '21+'];
const PRICE_OPTIONS = ['Free', '< $10', '< $50', '< $100', '$100+'];
const TIME_OPTIONS = ['Morning', 'Noon', 'Evening', 'Late Night', 'Any'];

export default function FilterModal({ visible, onClose }: FilterModalProps) {
  const { colors, isDark } = useTheme();
  const [activeAge, setActiveAge] = useState('All Ages');
  const [activePrice, setActivePrice] = useState('Free');
  const [activeTime, setActiveTime] = useState('Morning');

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [hashtags, setHashtags] = useState('#summer #party');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);

  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Los Angeles, CA');

  const [radius, setRadius] = useState(75);
  const [trackWidth, setTrackWidth] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => updateRadius(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => updateRadius(evt.nativeEvent.locationX),
    })
  ).current;

  const updateRadius = (x: number) => {
    if (trackWidth > 0) {
      let percent = Math.max(0, Math.min(1, x / trackWidth));
      setRadius(Math.round(percent * 200));
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleReset = () => {
    setActiveAge('All Ages');
    setActivePrice('Free');
    setActiveTime('Morning');
    setSelectedDate(null);
    setHashtags('');
    setUseCurrentLocation(true);
    setSelectedLocation('Los Angeles, CA');
    setRadius(75);
  };

  const renderPills = (options: string[], active: string, onSelect: (val: string) => void) => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
        {options.map(opt => {
          const isActive = active === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, { borderColor: colors.border }, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, { color: colors.textSecondary }, isActive && { color: colors.background, fontWeight: 'bold' }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Filter</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Age Restrictions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Age Restrictions</Text>
              {renderPills(AGE_OPTIONS, activeAge, setActiveAge)}
            </View>

            {/* Price */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Price</Text>
              {renderPills(PRICE_OPTIONS, activePrice, setActivePrice)}
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Date & Time</Text>
              {renderPills(TIME_OPTIONS, activeTime, setActiveTime)}

              <TouchableOpacity
                style={[styles.inputBox, { backgroundColor: colors.card }]}
                activeOpacity={0.8}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  {selectedDate ? selectedDate.toLocaleDateString() : 'Pick a date'}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Hashtags */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Hashtags</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  value={hashtags}
                  onChangeText={setHashtags}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>

              <TouchableOpacity
                style={[styles.inputBox, styles.locationSearchBox, { borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => setLocationSearchVisible(true)}
              >
                <Feather name="search" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Search another location</Text>
              </TouchableOpacity>

              <View style={[styles.inputBox, styles.selectedLocationBox, { backgroundColor: isDark ? '#52525A' : '#F0F0F3' }]}>
                <Feather name="map-pin" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.inputText, { color: colors.text }]}>{selectedLocation}</Text>
              </View>

              <View style={[styles.currentLocationRow, { borderColor: colors.border }]}>
                <View style={styles.currentLocationLeft}>
                  <Feather name="target" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.inputText, { color: colors.text }]}>Current Location</Text>
                </View>
                <Switch
                  value={useCurrentLocation}
                  onValueChange={setUseCurrentLocation}
                  trackColor={{ false: isDark ? '#3A3A44' : '#E0E0E0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Radius Slider */}
              <View style={[styles.radiusContainer, { borderColor: colors.border }]}>
                <View style={styles.radiusHeader}>
                  <Text style={[styles.inputText, { color: colors.text }]}>Radius</Text>
                  <Text style={[styles.radiusValueText, { color: colors.primary }]}>{radius} miles</Text>
                </View>
                <View
                  style={[styles.sliderTrack, { backgroundColor: isDark ? '#3A3A44' : '#E0E0E0' }]}
                  onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                  {...panResponder.panHandlers}
                >
                  <View style={[styles.sliderFill, { width: `${(radius / 200) * 100}%`, backgroundColor: colors.primary }]} />
                  <View style={[styles.sliderThumb, { left: `${(radius / 200) * 100}%`, backgroundColor: colors.text }]} />
                </View>
                <View style={styles.radiusLabels}>
                  <Text style={[styles.radiusLabelText, { color: colors.textSecondary }]}>0</Text>
                  <Text style={[styles.radiusLabelText, { color: colors.textSecondary }]}>200 miles</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDark ? '#3A3A44' : '#E0E0E0' }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={[styles.applyBtnText, { color: colors.background }]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>

      <LocationSearchModal
        visible={locationSearchVisible}
        onClose={() => setLocationSearchVisible(false)}
        onSelectLocation={(loc) => setSelectedLocation(loc)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 60,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  placeholderText: {
    fontSize: 14,
  },
  inputText: {
    fontSize: 14,
    flex: 1,
  },
  locationSearchBox: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  selectedLocationBox: {
  },
  currentLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 50,
    height: 56,
    marginTop: 12,
  },
  currentLocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  radiusValueText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    transform: [{ translateX: -7 }],
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  radiusLabelText: {
    fontSize: 10,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelBtnText: {
    fontWeight: 'bold',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    fontWeight: 'bold',
  },
});
