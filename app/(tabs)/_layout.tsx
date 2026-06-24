import { Feather } from "@expo/vector-icons";
import { Tabs as ExpoTabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import AddOptionsModal from "../../components/modals/AddOptionsModal";
import { useTheme } from "@/hooks/useTheme";
import { getStorageFileUrl } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";

export default function TabLayout() {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [tabAvatarError, setTabAvatarError] = useState(false);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const tabAvatarUri = user?.avatarKey ? getStorageFileUrl(user.avatarKey) : null;
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  useEffect(() => {
    setTabAvatarError(false);
  }, [user?.avatarKey]);

  const TAB_BAR_INNER_HEIGHT = 56;
  const tabBarHeight = TAB_BAR_INNER_HEIGHT + insets.bottom;

  return (
    <>
      <ExpoTabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingTop: 12,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textSecondary,
        }}
      >
        <ExpoTabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              focused ? (
                <Svg width="64" height="32" viewBox="0 0 64 32" fill="none">
                  <Path d="M45.3327 16C45.3327 8.63622 39.3631 2.66669 31.9993 2.66669C24.6355 2.66669 18.666 8.63622 18.666 16C18.666 23.3638 24.6355 29.3334 31.9993 29.3334C39.3631 29.3334 45.3327 23.3638 45.3327 16Z" fill={colors.text} />
                  <Path d="M32.5359 11.0639L36.4291 9.76618C37.6107 9.3723 38.2016 9.17536 38.5135 9.48724C38.8253 9.79912 38.6284 10.3899 38.2344 11.5716L36.9367 15.4648C36.2655 17.4784 35.9299 18.4852 35.2079 19.2072C34.4859 19.9292 33.4791 20.2648 31.4655 20.936L27.5723 22.2337C26.3906 22.6277 25.7998 22.8246 25.4879 22.5128C25.176 22.2009 25.373 21.61 25.7669 20.4284L27.0646 16.5352C27.7358 14.5216 28.0714 13.5148 28.7934 12.7927C29.5155 12.0707 30.5223 11.7351 32.5359 11.0639Z" fill={colors.background} />
                  <Path d="M32.166 16H31.9993M32.3327 16C32.3327 16.1842 32.1835 16.3334 31.9993 16.3334C31.8152 16.3334 31.666 16.1842 31.666 16C31.666 15.8159 31.8152 15.6667 31.9993 15.6667C32.1835 15.6667 32.3327 15.8159 32.3327 16Z" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              ) : (
                <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <Path d="M29.3327 15.9993C29.3327 8.63555 23.3631 2.66602 15.9993 2.66602C8.63555 2.66602 2.66602 8.63555 2.66602 15.9993C2.66602 23.3631 8.63555 29.3334 15.9993 29.3334C23.3631 29.3334 29.3327 23.3631 29.3327 15.9993Z" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M16.5359 11.0646L20.4291 9.76685C21.6107 9.37297 22.2016 9.17603 22.5135 9.48791C22.8253 9.79979 22.6284 10.3906 22.2344 11.5723L20.9367 15.4655C20.2655 17.4791 19.9299 18.4859 19.2079 19.2079C18.4859 19.9299 17.4791 20.2655 15.4655 20.9367L11.5723 22.2344C10.3906 22.6284 9.79979 22.8253 9.48791 22.5135C9.17603 22.2016 9.37297 21.6107 9.76685 20.4291L11.0646 16.5359C11.7358 14.5223 12.0714 13.5155 12.7934 12.7934C13.5155 12.0714 14.5223 11.7358 16.5359 11.0646Z" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M16.166 15.9993H15.9993M16.3327 15.9993C16.3327 16.1835 16.1835 16.3327 15.9993 16.3327C15.8152 16.3327 15.666 16.1835 15.666 15.9993C15.666 15.8152 15.8152 15.666 15.9993 15.666C16.1835 15.666 16.3327 15.8152 16.3327 15.9993Z" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )
            ),
          }}
        />
        <ExpoTabs.Screen
          name="explore"
          options={{
            tabBarIcon: ({ focused }) => (
              <View>
                {focused ? (
                  <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <Path d="M11.5048 16.8981H10.8929C8.91458 16.8981 7.92542 16.8981 7.5038 16.2459C7.08217 15.5937 7.4839 14.6851 8.28737 12.8678L10.7029 7.40431C11.4334 5.752 11.7987 4.92584 12.5073 4.46292C13.2159 4 14.1152 4 15.914 4H18.6998C20.8849 4 21.9774 4 22.3894 4.7138C22.8016 5.4276 22.2596 6.38117 21.1754 8.28831L19.7462 10.8025C19.2073 11.7506 18.9378 12.2247 18.9416 12.6127C18.9465 13.117 19.2146 13.5816 19.6478 13.836C19.9812 14.0319 20.5242 14.0319 21.6105 14.0319C22.9837 14.0319 23.6704 14.0319 24.028 14.2696C24.4925 14.5784 24.7357 15.1309 24.6505 15.6843C24.5849 16.1101 24.123 16.6208 23.1993 17.6423L15.8192 25.8031C14.3696 27.406 13.6448 28.2075 13.1581 27.9539C12.6714 27.7001 12.9051 26.6429 13.3725 24.5283L14.2882 20.3861C14.6441 18.776 14.8221 17.9709 14.3941 17.4345C13.9661 16.8981 13.1457 16.8981 11.5048 16.8981Z" fill={colors.text} />
                  </Svg>
                ) : (
                  <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <Path d="M11.5048 16.8981H10.8929C8.91458 16.8981 7.92542 16.8981 7.5038 16.2459C7.08217 15.5937 7.4839 14.6851 8.28737 12.8678L10.7029 7.40431C11.4334 5.752 11.7987 4.92584 12.5073 4.46292C13.2159 4 14.1152 4 15.914 4H18.6998C20.8849 4 21.9774 4 22.3894 4.7138C22.8016 5.4276 22.2596 6.38117 21.1754 8.28831L19.7462 10.8025C19.2073 11.7506 18.9378 12.2247 18.9416 12.6127C18.9465 13.117 19.2146 13.5816 19.6478 13.836C19.9812 14.0319 20.5242 14.0319 21.6105 14.0319C22.9837 14.0319 23.6704 14.0319 24.028 14.2696C24.4925 14.5784 24.7357 15.1309 24.6505 15.6843C24.5849 16.1101 24.123 16.6208 23.1993 17.6423L15.8192 25.8031C14.3696 27.406 13.6448 28.2075 13.1581 27.9539C12.6714 27.7001 12.9051 26.6429 13.3725 24.5283L14.2882 20.3861C14.6441 18.776 14.8221 17.9709 14.3941 17.4345C13.9661 16.8981 13.1457 16.8981 11.5048 16.8981Z" stroke={colors.textSecondary} strokeWidth={2} strokeLinejoin="round" />
                  </Svg>
                )}
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
        <ExpoTabs.Screen
          name="add"
          options={{
            tabBarIcon: ({ color }) => <Feather name="plus-circle" size={24} color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setIsAddModalVisible(true);
            },
          }}
        />
      <ExpoTabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => (
            focused ? (
              <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <Path d="M28.6673 16.0007C28.6673 22.9963 22.9963 28.6673 16.0007 28.6673C13.8299 28.6673 11.7865 28.1212 10.0007 27.1589C7.50968 25.8167 5.83348 27.0645 4.35521 27.2884C4.13097 27.3224 3.90764 27.2409 3.74728 27.0807C3.50386 26.8372 3.45753 26.4608 3.59198 26.1439C4.17218 24.7764 4.70492 22.1849 3.97853 20.0007C3.56038 18.7433 3.33398 17.3984 3.33398 16.0007C3.33398 9.00504 9.00504 3.33398 16.0007 3.33398C22.9963 3.33398 28.6673 9.00504 28.6673 16.0007Z" fill={colors.text} />
                <Path d="M16.1683 15.9993H16.0016M10.834 15.9993H10.6673M21.5007 15.9993H21.334M16.3349 15.9993C16.3349 16.1835 16.1857 16.3327 16.0016 16.3327C15.8176 16.3327 15.6683 16.1835 15.6683 15.9993C15.6683 15.8152 15.8176 15.666 16.0016 15.666C16.1857 15.666 16.3349 15.8152 16.3349 15.9993ZM11.0007 15.9993C11.0007 16.1835 10.8514 16.3327 10.6673 16.3327C10.4832 16.3327 10.334 16.1835 10.334 15.9993C10.334 15.8152 10.4832 15.666 10.6673 15.666C10.8514 15.666 11.0007 15.8152 11.0007 15.9993ZM21.6673 15.9993C21.6673 16.1835 21.5181 16.3327 21.334 16.3327C21.1499 16.3327 21.0007 16.1835 21.0007 15.9993C21.0007 15.8152 21.1499 15.666 21.334 15.666C21.5181 15.666 21.6673 15.8152 21.6673 15.9993Z" stroke={colors.background} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : (
              <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <Path d="M28.6673 16.0007C28.6673 22.9963 22.9963 28.6673 16.0007 28.6673C13.8299 28.6673 11.7865 28.1212 10.0007 27.1589C7.50968 25.8167 5.83348 27.0645 4.35521 27.2884C4.13097 27.3224 3.90764 27.2409 3.74728 27.0807C3.50386 26.8372 3.45753 26.4608 3.59198 26.1439C4.17218 24.7764 4.70492 22.1849 3.97853 20.0007C3.56038 18.7433 3.33398 17.3984 3.33398 16.0007C3.33398 9.00504 9.00504 3.33398 16.0007 3.33398C22.9963 3.33398 28.6673 9.00504 28.6673 16.0007Z" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M16.1683 15.9993H16.0016M10.834 15.9993H10.6673M21.5007 15.9993H21.334M16.3349 15.9993C16.3349 16.1835 16.1857 16.3327 16.0016 16.3327C15.8176 16.3327 15.6683 16.1835 15.6683 15.9993C15.6683 15.8152 15.8176 15.666 16.0016 15.666C16.1857 15.666 16.3349 15.8152 16.3349 15.9993ZM11.0007 15.9993C11.0007 16.1835 10.8514 16.3327 10.6673 16.3327C10.4832 16.3327 10.334 16.1835 10.334 15.9993C10.334 15.8152 10.4832 15.666 10.6673 15.666C10.8514 15.666 11.0007 15.8152 11.0007 15.9993ZM21.6673 15.9993C21.6673 16.1835 21.5181 16.3327 21.334 16.3327C21.1499 16.3327 21.0007 16.1835 21.0007 15.9993C21.0007 15.8152 21.1499 15.666 21.334 15.666C21.5181 15.666 21.6673 15.8152 21.6673 15.9993Z" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )
          ),
        }}
      />
      <ExpoTabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.profileAvatar, { borderColor: focused ? colors.text : 'transparent' }]}>
              {tabAvatarUri && !tabAvatarError ? (
                <Image
                  source={{ uri: tabAvatarUri }}
                  style={styles.profileImage}
                  onError={() => setTabAvatarError(true)}
                />
              ) : (
                <View style={[styles.profileImage, styles.profileImageFallback, { backgroundColor: colors.card }]}>
                  <Feather name="user" size={14} color={colors.textSecondary} />
                </View>
              )}
            </View>
          ),
        }}
      />
      </ExpoTabs>

      <AddOptionsModal 
        visible={isAddModalVisible} 
        onClose={() => setIsAddModalVisible(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  profileAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    marginTop: -2,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F2245C",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
  },
});


