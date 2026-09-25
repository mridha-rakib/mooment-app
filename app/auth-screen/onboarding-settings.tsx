import { Feather } from "@expo/vector-icons";
import {
  getBestCurrentDeviceLocation,
  type CurrentLocationPayload,
  type DeviceLocationResult,
} from "@/lib/locationSharing";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
/* 🔥 Types */
type CustomSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

type OnboardingLocationResolution = {
  location: CurrentLocationPayload | null;
  message?: string;
  status?: DeviceLocationResult["status"];
};

const getLocationResolutionMessage = (result: DeviceLocationResult) => {
  if (result.status === "fresh" || result.status === "lastKnown") {
    return undefined;
  }

  if ("message" in result && result.message) {
    return result.message;
  }

  if (result.status === "servicesDisabled") {
    return "Turn on Location Services before sharing your current location.";
  }

  if (result.status === "permissionDenied" || result.status === "permissionBlocked") {
    return "Allow location access in your device settings before sharing your current location.";
  }

  return "Unable to read your current location. Check Location Services and try again.";
};

/* 🔥 Custom Switch */
const CustomSwitch: React.FC<CustomSwitchProps> = ({
  value,
  onValueChange,
  disabled,
}) => {
  const { colors, isDark } = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [anim, value]);

  const toggle = () => {
    if (disabled) {
      return;
    }

    Animated.timing(anim, {
      toValue: value ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();

    onValueChange(!value);
  };

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 30],
  });

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8} disabled={disabled}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: value ? colors.primary : (isDark ? "#2B2B36" : "#E0E0E0"),
            opacity: disabled ? 0.65 : 1,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: value ? (isDark ? colors.background : "#FFFFFF") : (isDark ? "#555566" : "#AAAAAA"),
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function OnboardingSettings() {
  const { colors, isDark } = useTheme();
  const userLocationSharingEnabled = useAuthStore((state) => Boolean(state.user?.currentLocationSharingEnabled));
  const userNotificationsEnabled = useAuthStore((state) => state.user?.notificationsEnabled ?? true);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(userLocationSharingEnabled);
  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(userNotificationsEnabled);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const cachedLocationRef = useRef<CurrentLocationPayload | null>(null);
  const pendingLocationRef = useRef<Promise<OnboardingLocationResolution> | null>(null);
  const isMountedRef = useRef(true);
  const hasCompletedRef = useRef(false);
  const locationRequestGenerationRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      locationRequestGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    setLocationEnabled(userLocationSharingEnabled);
  }, [userLocationSharingEnabled]);

  useEffect(() => {
    setNotificationsEnabled(userNotificationsEnabled);
  }, [userNotificationsEnabled]);

  const getOnboardingLocation = (): Promise<OnboardingLocationResolution> => {
    if (cachedLocationRef.current) {
      return Promise.resolve({ location: cachedLocationRef.current });
    }

    if (!pendingLocationRef.current) {
      pendingLocationRef.current = getBestCurrentDeviceLocation()
        .then((result) => {
          if (result.status === "fresh" || result.status === "lastKnown") {
            cachedLocationRef.current = result.location;
            return {
              location: result.location,
              status: result.status,
            };
          }

          return {
            location: null,
            message: getLocationResolutionMessage(result),
            status: result.status,
          };
        })
        .catch((error) => {
          return {
            location: null,
            message:
              error instanceof Error
                ? error.message
                : "Unable to read your current location. Check Location Services and try again.",
            status: "failed",
          } satisfies OnboardingLocationResolution;
        })
        .finally(() => {
          pendingLocationRef.current = null;
        });
    }

    return pendingLocationRef.current;
  };

  const handleLocationToggle = async (nextValue: boolean) => {
    if (!nextValue) {
      locationRequestGenerationRef.current += 1;
      cachedLocationRef.current = null;
      if (isMountedRef.current) {
        setLocationEnabled(false);
        setIsResolvingLocation(false);
      }
      return;
    }

    const requestGeneration = locationRequestGenerationRef.current + 1;
    locationRequestGenerationRef.current = requestGeneration;
    setLocationEnabled(true);
    setIsResolvingLocation(true);

    try {
      const resolution = await getOnboardingLocation();

      if (!isMountedRef.current || requestGeneration !== locationRequestGenerationRef.current) {
        return;
      }

      if (!resolution.location) {
        cachedLocationRef.current = null;
        setLocationEnabled(false);

        if (resolution.message) {
          Alert.alert("Current Location", resolution.message);
        }
      }
    } catch (error) {
      if (isMountedRef.current && requestGeneration === locationRequestGenerationRef.current) {
        cachedLocationRef.current = null;
        setLocationEnabled(false);
        Alert.alert(
          "Current Location",
          error instanceof Error ? error.message : "Unable to enable current location sharing.",
        );
      }
    } finally {
      if (isMountedRef.current && requestGeneration === locationRequestGenerationRef.current) {
        setIsResolvingLocation(false);
      }
    }
  };

  const handleDone = async () => {
    if (isCompleting || isResolvingLocation || hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;
    setIsCompleting(true);

    try {
      let currentLocation: CurrentLocationPayload | null = null;
      let shouldEnableLocation = locationEnabled;

      if (locationEnabled) {
        const resolution = await getOnboardingLocation();
        currentLocation = resolution.location;
        shouldEnableLocation = Boolean(currentLocation);
      }

      const shouldPersistProfile =
        shouldEnableLocation ||
        shouldEnableLocation !== userLocationSharingEnabled ||
        notificationsEnabled !== userNotificationsEnabled;

      if (shouldPersistProfile) {
        await updateProfile({
          currentLocationSharingEnabled: shouldEnableLocation,
          currentLocation,
          notificationsEnabled,
        });
      }

      if (!isMountedRef.current) {
        return;
      }

      router.replace('/(tabs)/home?showSuccess=true');
    } catch (error) {
      hasCompletedRef.current = false;

      if (isMountedRef.current) {
        Alert.alert(
          "Current Location",
          error instanceof Error ? error.message : "Unable to save your location preference.",
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsCompleting(false);
      }
    }
  };

  const isBusy = isCompleting || isResolvingLocation;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Welcome to Mooment!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              To get the best experience. Please enable
            </Text>
          </View>

          {/* Location */}
          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? "#333333" : "#F0F0F3" }]}>
                <Feather name="map-pin" size={20} color={colors.text} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Location Service</Text>
                <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                  Find events near you by allowing location access
                </Text>
              </View>

              <CustomSwitch
                value={locationEnabled}
                onValueChange={handleLocationToggle}
                disabled={isCompleting}
              />
            </View>
          </View>

          {/* Notifications */}
          <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? "#333333" : "#F0F0F3" }]}>
                <Feather name="bell" size={20} color={colors.text} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                  Stay updated with the latest events and alerts
                </Text>
              </View>

              <CustomSwitch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: buttonBackground(colors) }, isBusy && styles.doneButtonDisabled]}
            activeOpacity={0.8}
            disabled={isBusy}
            onPress={handleDone}
          >
            <Text style={[styles.doneButtonText, { color: buttonForeground(colors) }]}>Done</Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            You can change these at any time from the{" "}
            <Text style={[styles.footerHighlight, { color: colors.primary }]}>app settings</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingTop: 120,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },

  /* 🔥 Custom Switch */
  track: {
    width: 48,
    height: 24,
    borderRadius: 20,
    justifyContent: "center",
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 9,
    position: "absolute",
  },

  doneButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  doneButtonDisabled: {
    opacity: 0.65,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
  },
  footerHighlight: {
    fontWeight: "bold",
  },
});
