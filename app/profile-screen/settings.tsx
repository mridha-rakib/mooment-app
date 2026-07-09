import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, StatusBar } from "react-native";
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
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const enableLocationSharing = useLocationSharingStore((state) => state.enableSharing);
  const disableLocationSharing = useLocationSharingStore((state) => state.disableSharing);

  // Settings states
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
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

  const handleConfirmDeleteAccount = async () => {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      await deleteAccount();
      router.replace('/auth-screen/onboarding');
    } catch (error) {
      Alert.alert(
        "Delete Account",
        error instanceof Error ? error.message : "Unable to delete your account. Please try again.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account access and sign you out. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleConfirmDeleteAccount();
          },
        },
      ],
    );
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 72, 96) },
        ]}
      >
        
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
        </View>

        {/* BUSINESS Section — only visible for business accounts */}
        {user?.accountType === 'business' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BUSINESS</Text>
            <View style={styles.sectionGroup}>
              <SettingItem
                icon="sliders"
                label="Payout Preferences"
                onPress={() => router.push('/profile-screen/payout-preferences')}
                colors={colors}
              />
              <SettingItem
                icon="credit-card"
                label="Withdrawal Method"
                onPress={() => router.push('/profile-screen/withdrawal-method')}
                colors={colors}
              />
              <SettingItem
                icon="briefcase"
                label="Bank Account"
                onPress={() => router.push('/profile-screen/bank-account')}
                colors={colors}
              />
              <SettingItem
                icon="list"
                label="Payout History"
                onPress={() => router.push('/profile-screen/payout-history')}
                colors={colors}
              />
            </View>
          </>
        )}

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
        <TouchableOpacity
          style={[
            styles.deleteAccountBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
            isDeletingAccount && styles.settingItemDisabled,
          ]}
          onPress={handleDeleteAccountPress}
          disabled={isDeletingAccount}
        >
          {isDeletingAccount ? (
            <Spinner color={colors.danger} />
          ) : (
            <Text style={[styles.deleteAccountText, { color: colors.danger }]}>Delete Account</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

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

});
