import { Feather } from '@expo/vector-icons';
import { FilterHorizontalIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import FilterModal from './FilterModal';

const { width } = Dimensions.get('window');

export default function HomeHeader() {
  const router = useRouter();
  const [filterVisible, setFilterVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedType, setSelectedType] = useState('Feed');
  return (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.feedBtn} 
        activeOpacity={0.8}
        onPress={() => setDropdownVisible(true)}
      >
        <View style={styles.greenDot} />
        <Text style={styles.feedText}>{selectedType}</Text>
        <Feather name="chevron-down" size={14} color="#FFFFFF" />
      </TouchableOpacity>
      <Image source={require('../../assets/images/Mooment.png')} style={styles.logoText} />
      <View style={styles.headerIcons}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={() => router.push('/discover-screen/search')}>
          <HugeiconsIcon icon={Search01Icon} size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={() => setFilterVisible(true)}>
          <HugeiconsIcon icon={FilterHorizontalIcon} size={20} color="#FFFFFF" />
        </TouchableOpacity>
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
            <View style={styles.dropdownMenu}>
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => { setSelectedType('Feed'); setDropdownVisible(false); }}
              >
                <View style={styles.greenDot} />
                <Text style={styles.dropdownText}>Feed</Text>
              </TouchableOpacity>
              <View style={styles.dropdownSeparator} />
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => { setSelectedType('Map'); setDropdownVisible(false); }}
              >
                <View style={styles.greenDot} />
                <Text style={styles.dropdownText}>Map</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    zIndex: 100,
  },
  feedBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
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
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    marginRight: 4,
  },
  logoText: {
    width: 100,
    height: 25,
    resizeMode: 'contain',
    position: 'absolute',
    left: width / 2 - 50,
    top: 25,
  },
  headerIcons: {
    flexDirection: "row",
  },
  iconBtn: {
    marginLeft: 15,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 80,
    left: 20,
    backgroundColor: '#35353A',
    borderRadius: 12,
    paddingVertical: 8,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 12,
  },
});
