import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

/* 🔥 Types */
type CustomSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/* 🔥 Custom Switch */
const CustomSwitch: React.FC<CustomSwitchProps> = ({
  value,
  onValueChange,
}) => {
  const { colors, isDark } = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const toggle = () => {
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
    <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: value ? colors.primary : (isDark ? "#2B2B36" : "#E0E0E0"),
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
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(true);

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
                onValueChange={setLocationEnabled}
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
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)/home?showSuccess=true')}
          >
            <Text style={[styles.doneButtonText, { color: colors.background }]}>Done</Text>
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