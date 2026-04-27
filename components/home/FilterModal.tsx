import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, SafeAreaView, Platform, ScrollView, Switch, PanResponder } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import LocationSearchModal from '@/components/post/LocationSearchModal';

export type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
};

const AGE_OPTIONS = ['All Ages', '18+', '21+'];
const PRICE_OPTIONS = ['Free', '< $10', '< $50', '< $100', '$100+'];
const TIME_OPTIONS = ['Morning', 'Noon', 'Evening', 'Late Night', 'Any'];

export default function FilterModal({ visible, onClose }: FilterModalProps) {
  const [activeAge, setActiveAge] = useState('All Ages');
  const [activePrice, setActivePrice] = useState('Free');
  const [activeTime, setActiveTime] = useState('Morning');
  
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

  const renderPills = (options: string[], active: string, onSelect: (val: string) => void) => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
        {options.map(opt => {
          const isActive = active === opt;
          return (
            <TouchableOpacity 
              key={opt}
              style={[styles.pill, isActive && styles.activePill]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, isActive && styles.activePillText]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#8E8E9B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filter</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Age Restrictions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Age Restrictions</Text>
              {renderPills(AGE_OPTIONS, activeAge, setActiveAge)}
            </View>

            {/* Price */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price</Text>
              {renderPills(PRICE_OPTIONS, activePrice, setActivePrice)}
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date & Time</Text>
              {renderPills(TIME_OPTIONS, activeTime, setActiveTime)}
              
              <TouchableOpacity style={styles.inputBox} activeOpacity={0.8}>
                <Feather name="calendar" size={16} color="#8E8E9B" style={styles.inputIcon} />
                <Text style={styles.placeholderText}>Pick a date range</Text>
              </TouchableOpacity>
            </View>

            {/* Hashtags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hashtags</Text>
              <View style={styles.inputBox}>
                <TextInput 
                  style={styles.inputText}
                  value={hashtags}
                  onChangeText={setHashtags}
                  placeholderTextColor="#8E8E9B"
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              
              <TouchableOpacity 
                style={[styles.inputBox, styles.locationSearchBox]} 
                activeOpacity={0.8}
                onPress={() => setLocationSearchVisible(true)}
              >
                <Feather name="search" size={16} color="#8E8E9B" style={styles.inputIcon} />
                <Text style={styles.placeholderText}>Search another location</Text>
              </TouchableOpacity>

              <View style={[styles.inputBox, styles.selectedLocationBox]}>
                <Feather name="map-pin" size={16} color="#8E8E9B" style={styles.inputIcon} />
                <Text style={styles.inputText}>{selectedLocation}</Text>
              </View>

              <View style={styles.currentLocationRow}>
                <View style={styles.currentLocationLeft}>
                  <Feather name="target" size={16} color="#8E8E9B" style={styles.inputIcon} />
                  <Text style={styles.inputText}>Current Location</Text>
                </View>
                <Switch 
                  value={useCurrentLocation} 
                  onValueChange={setUseCurrentLocation}
                  trackColor={{ false: '#3A3A44', true: '#8E54E9' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Radius Slider */}
              <View style={styles.radiusContainer}>
                <View style={styles.radiusHeader}>
                  <Text style={styles.inputText}>Radius</Text>
                  <Text style={styles.radiusValueText}>{radius} miles</Text>
                </View>
                <View 
                  style={styles.sliderTrack}
                  onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                  {...panResponder.panHandlers}
                >
                  <View style={[styles.sliderFill, { width: `${(radius / 200) * 100}%` }]} />
                  <View style={[styles.sliderThumb, { left: `${(radius / 200) * 100}%` }]} />
                </View>
                <View style={styles.radiusLabels}>
                  <Text style={styles.radiusLabelText}>0</Text>
                  <Text style={styles.radiusLabelText}>200 miles</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
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
    backgroundColor: '#0e0d12',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetText: {
    color: '#8E54E9', // purple tint
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activePill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pillText: {
    color: '#D0D0D8',
    fontSize: 13,
  },
  activePillText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C24',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  placeholderText: {
    color: '#8E8E9B',
    fontSize: 14,
  },
  inputText: {
    color: '#D0D0D8',
    fontSize: 14,
    flex: 1,
  },
  locationSearchBox: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
  selectedLocationBox: {
    backgroundColor: '#52525A', // slightly lighter grey
  },
  currentLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
    marginTop: 12,
  },
  currentLocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    color: '#8E54E9',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#3A3A44',
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  sliderThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    transform: [{ translateX: -7 }],
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  radiusLabelText: {
    color: '#8E8E9B',
    fontSize: 10,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#3A3A44',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  applyBtn: {
    flex: 1,
    backgroundColor: '#D4B0EB', // Violet tint matching screenshot button
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#0e0d12',
    fontWeight: 'bold',
  },
});
