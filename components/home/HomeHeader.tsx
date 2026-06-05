import { Feather } from '@expo/vector-icons';
import { FilterHorizontalIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import FilterModal from './FilterModal';
import { useTheme } from '@/hooks/useTheme';
import CinematicButton from '../ui/CinematicButton';

const { width } = Dimensions.get('window');

interface HomeHeaderProps {
  selectedType: string;
  setSelectedType: (type: string) => void;
}

export default function HomeHeader({ selectedType, setSelectedType }: HomeHeaderProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [filterVisible, setFilterVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const isMapMode = selectedType === 'Map';

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.feedBtn, { backgroundColor: colors.card }]} 
          activeOpacity={0.8}
          onPress={() => setDropdownVisible(true)}
        >
          <View style={styles.greenDot} />
          <Text style={[styles.feedText, { color: colors.text }]}>{selectedType}</Text>
          <Feather name="chevron-down" size={14} color={colors.text} />
        </TouchableOpacity>

        <Image 
          source={require('@/assets/images/Mooment.png')}
          style={[styles.logoImage, { tintColor: colors.text }]} 
          resizeMode="contain" 
        />

        <View style={styles.headerIcons}>
          <CinematicButton
            icon={Search01Icon}
            onPress={() => router.push('/discover-screen/search')}
            style={styles.iconBtn}
          />
          <CinematicButton
            icon={FilterHorizontalIcon}
            onPress={() => setFilterVisible(true)}
            style={styles.iconBtn}
          />
        </View>
      </View>



      {/* Feed/Map Dropdown */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.dropdownOverlay}>
            <View style={[styles.dropdownMenu, { backgroundColor: colors.card }]}>
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => { setSelectedType('Feed'); setDropdownVisible(false); }}
              >
                <View style={[styles.greenDot, selectedType === 'Feed' ? { opacity: 1 } : { opacity: 0 }]} />
                <Text style={[styles.dropdownText, { color: colors.text }]}>Feed</Text>
              </TouchableOpacity>
              <View style={[styles.dropdownSeparator, { backgroundColor: colors.border }]} />
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => { setSelectedType('Map'); setDropdownVisible(false); }}
              >
                <View style={[styles.greenDot, selectedType === 'Map' ? { opacity: 1 } : { opacity: 0 }]} />
                <Text style={[styles.dropdownText, { color: colors.text }]}>Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <FilterModal visible={filterVisible} onClose={() => setFilterVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    zIndex: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  feedBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2DB46D",
    marginRight: 8,
  },
  feedText: {
    fontSize: 13,
    fontWeight: "bold",
    marginRight: 4,
  },
  logoImage: {
    width: 120,
    height: 28,
  },
  headerIcons: {
    flexDirection: "row",
  },
  iconBtn: {
    marginLeft: 12,
  },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 80,
    left: 20,
    borderRadius: 12,
    paddingVertical: 8,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownSeparator: {
    height: 1,
    marginHorizontal: 12,
  },
});
