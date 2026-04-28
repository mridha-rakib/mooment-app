import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

type SettingItemProps = {
  icon: string;
  label: string;
  type?: 'toggle' | 'arrow' | 'dropdown';
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  onPress?: () => void;
};

const SettingItem = ({ icon, label, type = 'arrow', value, onValueChange, onPress }: SettingItemProps) => (
  <TouchableOpacity 
    style={styles.settingItem} 
    onPress={onPress} 
    activeOpacity={type === 'toggle' ? 1 : 0.7}
  >
    <View style={styles.settingItemLeft}>
      <Feather name={icon as any} size={18} color="#8E8E9B" />
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <View style={styles.settingItemRight}>
      {type === 'toggle' && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#2A2A32', true: '#E5D5F0' }}
          thumbColor={value ? '#0e0d12' : '#FFFFFF'}
          ios_backgroundColor="#2A2A32"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      )}
      {type === 'arrow' && <Feather name="chevron-right" size={18} color="#8E8E9B" />}
      {type === 'dropdown' && <Feather name="chevron-down" size={18} color="#8E8E9B" />}
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();

  // Settings states
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  // Bottom sheet states
  const [isAccountTypeModalVisible, setAccountTypeModalVisible] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<'personal' | 'business'>('personal');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ESSENTIALS Section */}
        <Text style={styles.sectionTitle}>ESSENTIALS</Text>
        <View style={styles.sectionGroup}>
          <SettingItem 
            icon="map-pin" 
            label="Current Location" 
            type="toggle" 
            value={locationEnabled}
            onValueChange={setLocationEnabled}
          />
          <SettingItem 
            icon="bell" 
            label="Notification" 
            type="toggle" 
            value={notificationEnabled}
            onValueChange={setNotificationEnabled}
          />
          <SettingItem 
            icon="moon" 
            label="Dark Mode" 
            type="toggle" 
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
          />
          <SettingItem 
            icon="refresh-cw" 
            label="Switch Account Type" 
            type="dropdown" 
            onPress={() => setAccountTypeModalVisible(true)}
          />
        </View>

        {/* TERMS & POLICIES Section */}
        <Text style={styles.sectionTitle}>TERMS & POLICIES</Text>
        <View style={styles.sectionGroup}>
          <SettingItem icon="file-text" label="Terms & Conditions" onPress={() => router.push('/profile-screen/terms')} />
          <SettingItem icon="shield" label="Privacy & Policy" onPress={() => router.push('/profile-screen/privacy')} />
          <SettingItem icon="headphones" label="Contact Support" />
        </View>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteAccountBtn}>
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Switch Account Type Modal */}
      <Modal
        visible={isAccountTypeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAccountTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.modalTitle}>Select Account Type</Text>
            <Text style={styles.modalSubtitle}>You can always change the account type</Text>

            <TouchableOpacity 
              style={[styles.radioItem, selectedAccountType === 'personal' && styles.radioItemSelected]} 
              onPress={() => setSelectedAccountType('personal')}
              activeOpacity={0.8}
            >
              <View style={styles.radioItemLeft}>
                <Text style={styles.radioLabel}>Personal Account</Text>
                {selectedAccountType === 'personal' && <View style={styles.greenDot} />}
              </View>
              <View style={[styles.radioCircle, selectedAccountType === 'personal' && styles.radioCircleSelected]}>
                {selectedAccountType === 'personal' && <View style={styles.radioInnerCircle} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.radioItem, selectedAccountType === 'business' && styles.radioItemSelected]} 
              onPress={() => setSelectedAccountType('business')}
              activeOpacity={0.8}
            >
              <View style={styles.radioItemLeft}>
                <Text style={styles.radioLabel}>Business Account</Text>
                {selectedAccountType === 'business' && <View style={styles.greenDot} />}
              </View>
              <View style={[styles.radioCircle, selectedAccountType === 'business' && styles.radioCircleSelected]}>
                {selectedAccountType === 'business' && <View style={styles.radioInnerCircle} />}
              </View>
            </TouchableOpacity>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelModalBtn} 
                onPress={() => setAccountTypeModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.doneModalBtn} 
                onPress={() => {
                  setAccountTypeModalVisible(false);
                  // Optionally redirect or update global state here
                  // router.push({ pathname: '/profile-screen/edit-profile', params: { type: selectedAccountType }});
                }}
              >
                <Text style={styles.doneModalText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#8E8E9B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 25,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionGroup: {
    backgroundColor: '#0e0d12', // matching background since items have borders
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#13131A',
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A22',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  settingItemRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountBtn: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A22',
    backgroundColor: '#13131A',
  },
  deleteAccountText: {
    color: '#FF4B4B',
    fontSize: 14,
    fontWeight: '500',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A22',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#2A2A32',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#8E8E9B',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 25,
  },
  radioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A22',
    marginBottom: 12,
    backgroundColor: '#0e0d12',
  },
  radioItemSelected: {
    borderColor: '#3B3B45',
  },
  radioItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radioLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2DB46D',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8E8E9B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#E5D5F0',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5D5F0',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  cancelModalBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneModalBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5D5F0',
    borderRadius: 12,
    marginLeft: 10,
  },
  doneModalText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
