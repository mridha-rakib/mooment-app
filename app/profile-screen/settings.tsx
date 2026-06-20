import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { setTheme } from "@/redux/slice/preference";
import { useTheme } from "@/hooks/useTheme";
import { writeThemePreference } from "@/lib/themePreference";
import { useAuthStore } from "@/stores/authStore";
import { useLocationSharingStore } from "@/stores/locationSharingStore";

type SettingItemProps = {
  icon: string;
  label: string;
  type?: 'toggle' | 'arrow' | 'dropdown';
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  onPress?: () => void;
  disabled?: boolean;
};

const SettingItem = ({ icon, label, type = 'arrow', value, onValueChange, onPress, disabled, colors }: SettingItemProps & { colors: any }) => (
  <TouchableOpacity 
    style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }, disabled && styles.settingItemDisabled]}
    onPress={onPress} 
    disabled={disabled}
    activeOpacity={type === 'toggle' ? 1 : 0.7}
  >
    <View style={styles.settingItemLeft}>
      <Feather name={icon as any} size={18} color={colors.textSecondary} />
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
    </View>
    <View style={styles.settingItemRight}>
      {type === 'toggle' && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={value ? (colors.isDark ? '#FFFFFF' : colors.background) : '#FFFFFF'}
          ios_backgroundColor={colors.border}
          disabled={disabled}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      )}
      {type === 'arrow' && <Feather name="chevron-right" size={18} color={colors.textSecondary} />}
      {type === 'dropdown' && <Feather name="chevron-down" size={18} color={colors.textSecondary} />}
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const enableLocationSharing = useLocationSharingStore((state) => state.enableSharing);
  const disableLocationSharing = useLocationSharingStore((state) => state.disableSharing);

  // Settings states
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Bottom sheet states
  const [isAccountTypeModalVisible, setAccountTypeModalVisible] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<'personal' | 'business'>(user?.accountType ?? 'personal');
  const [isSwitchingAccountType, setIsSwitchingAccountType] = useState(false);
  const locationEnabled = Boolean(user?.currentLocationSharingEnabled);
  const notificationEnabled = user?.notificationsEnabled ?? true;

  const handleLocationSharingChange = async (nextValue: boolean) => {
    if (isUpdatingLocation) {
      return;
    }

    setIsUpdatingLocation(true);

    try {
      if (nextValue) {
        await enableLocationSharing();
      } else {
        await disableLocationSharing();
      }
    } catch (error) {
      Alert.alert(
        "Current Location",
        error instanceof Error ? error.message : "Unable to update current location sharing.",
      );
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleDarkModeChange = (nextValue: boolean) => {
    const nextTheme = nextValue ? 'dark' : 'light';

    dispatch(setTheme(nextTheme));
    void writeThemePreference(nextTheme);
  };

  const handleOpenAccountTypeModal = () => {
    setSelectedAccountType(user?.accountType ?? 'personal');
    setAccountTypeModalVisible(true);
  };

  const handleAccountTypeDone = async () => {
    if (selectedAccountType === user?.accountType) {
      setAccountTypeModalVisible(false);
      return;
    }

    if (completedProfileTypes.includes(selectedAccountType)) {
      setIsSwitchingAccountType(true);
      try {
        await updateProfile({ accountType: selectedAccountType });
      } catch (error) {
        Alert.alert(
          "Switch Account Type",
          error instanceof Error ? error.message : "Unable to switch account type. Please try again.",
        );
      } finally {
        setIsSwitchingAccountType(false);
      }
      setAccountTypeModalVisible(false);
    } else {
      setAccountTypeModalVisible(false);
      router.push({
        pathname: '/profile-screen/edit-profile',
        params: { type: selectedAccountType, mode: 'switch' },
      });
    }
  };

  const handleNotificationChange = async (nextValue: boolean) => {
    if (isUpdatingNotifications) {
      return;
    }

    setIsUpdatingNotifications(true);

    try {
      await updateProfile({
        notificationsEnabled: nextValue,
      });
    } catch (error) {
      Alert.alert(
        "Notifications",
        error instanceof Error ? error.message : "Unable to update notification preference.",
      );
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ESSENTIALS Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ESSENTIALS</Text>
        <View style={styles.sectionGroup}>
          <SettingItem 
            icon="map-pin" 
            label="Current Location" 
            type="toggle" 
            value={locationEnabled}
            onValueChange={handleLocationSharingChange}
            disabled={isUpdatingLocation}
            colors={colors}
          />
          <SettingItem 
            icon="bell" 
            label="Notification" 
            type="toggle" 
            value={notificationEnabled}
            onValueChange={handleNotificationChange}
            disabled={isUpdatingNotifications}
            colors={colors}
          />
          <SettingItem 
            icon="moon" 
            label="Dark Mode" 
            type="toggle" 
            value={isDark}
            onValueChange={handleDarkModeChange}
            colors={colors}
          />
          <SettingItem
            icon="refresh-cw"
            label="Switch Account Type"
            type="dropdown"
            onPress={handleOpenAccountTypeModal}
            colors={colors}
          />
        </View>

        {/* TERMS & POLICIES Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TERMS & POLICIES</Text>
        <View style={styles.sectionGroup}>
          <SettingItem icon="file-text" label="Terms & Conditions" onPress={() => router.push('/profile-screen/terms')} colors={colors} />
          <SettingItem icon="shield" label="Privacy & Policy" onPress={() => router.push('/profile-screen/privacy')} colors={colors} />
          <SettingItem 
            icon="headphones" 
            label="Contact Support" 
            onPress={() => router.push('/profile-screen/contact-support')} 
            colors={colors} 
          />
        </View>

        {/* Delete Account */}
        <TouchableOpacity style={[styles.deleteAccountBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.deleteAccountText, { color: colors.danger }]}>Delete Account</Text>
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
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={[styles.bottomSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={[styles.bottomSheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Account Type</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>You can always change the account type</Text>

            <TouchableOpacity 
              style={[
                styles.radioItem, 
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedAccountType === 'personal' && { borderColor: colors.primary }
              ]} 
              onPress={() => setSelectedAccountType('personal')}
              activeOpacity={0.8}
            >
              <View style={styles.radioItemLeft}>
                <Text style={[styles.radioLabel, { color: colors.text }]}>Personal Account</Text>
                {selectedAccountType === 'personal' && <View style={[styles.statusDot, { backgroundColor: '#2DB46D' }]} />}
              </View>
              <View style={[styles.radioCircle, { borderColor: colors.textSecondary }, selectedAccountType === 'personal' && { borderColor: colors.primary }]}>
                {selectedAccountType === 'personal' && <View style={[styles.radioInnerCircle, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.radioItem, 
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedAccountType === 'business' && { borderColor: colors.primary }
              ]} 
              onPress={() => setSelectedAccountType('business')}
              activeOpacity={0.8}
            >
              <View style={styles.radioItemLeft}>
                <Text style={[styles.radioLabel, { color: colors.text }]}>Business Account</Text>
                {selectedAccountType === 'business' && <View style={[styles.statusDot, { backgroundColor: '#2DB46D' }]} />}
              </View>
              <View style={[styles.radioCircle, { borderColor: colors.textSecondary }, selectedAccountType === 'business' && { borderColor: colors.primary }]}>
                {selectedAccountType === 'business' && <View style={[styles.radioInnerCircle, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setAccountTypeModalVisible(false)}
                disabled={isSwitchingAccountType}
              >
                <Text style={[styles.cancelModalText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.doneModalBtn, { backgroundColor: colors.primary }, isSwitchingAccountType && { opacity: 0.7 }]}
                onPress={handleAccountTypeDone}
                disabled={isSwitchingAccountType}
              >
                {isSwitchingAccountType ? (
                  <Spinner color={colors.background} />
                ) : (
                  <Text style={[styles.doneModalText, { color: colors.background }]}>Done</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 25,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionGroup: {
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingItemDisabled: {
    opacity: 0.65,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
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
  },
  deleteAccountText: {
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
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
    marginBottom: 12,
  },
  radioItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    fontSize: 16,
    fontWeight: '600',
  },
  doneModalBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 10,
  },
  doneModalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
