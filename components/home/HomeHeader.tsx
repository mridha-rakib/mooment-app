import { Feather } from '@expo/vector-icons';
import { FilterHorizontalIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import FilterModal from './FilterModal';
import { useTheme } from '@/hooks/useTheme';
import CinematicButton from '../ui/CinematicButton';

interface HomeHeaderProps {
  selectedType: string;
  setSelectedType: (type: string) => void;
}

export default function HomeHeader({ selectedType, setSelectedType }: HomeHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [filterVisible, setFilterVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

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

        <View pointerEvents="none" style={styles.logoSlot}>
          <Image
            source={require('@/assets/images/image.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerIcons}>
          <CinematicButton
            icon={Search01Icon}
            onPress={() => router.push('/discover-screen/search')}
            style={styles.iconBtn}
            width={38}
            height={38}
            borderRadius={19}
          />
          <CinematicButton
            icon={FilterHorizontalIcon}
            onPress={() => setFilterVisible(true)}
            style={styles.iconBtn}
            width={38}
            height={38}
            borderRadius={19}
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
    minHeight: 46,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    position: "relative",
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
    height: 38,
    minWidth: 96,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 19,
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
    width: 112,
    height: 26,
  },
  logoSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    marginLeft: 0,
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
