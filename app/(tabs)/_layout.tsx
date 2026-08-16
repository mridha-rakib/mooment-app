import { getDirectMessageConversations } from "@/lib/chat";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { subscribe as subscribeRealtime } from "@/lib/socketClient";
import { getStorageFileUrl } from "@/lib/storage";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useChatUnreadStore } from "@/stores/chatUnreadStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { Feather } from "@expo/vector-icons";
import { Tabs as ExpoTabs } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import AddOptionsModal from "../../components/modals/AddOptionsModal";
import UserAvatar from "../../components/ui/UserAvatar";

// Dark mode: exact pre-existing pixel values (approved, frozen).
const NAV_BAR_BACKGROUND_DARK = "#000000";
const NAV_BAR_ICON_ACTIVE_DARK = "#FFFFFF";
const NAV_BAR_ICON_INACTIVE_DARK = "#B3B3B3";
// Light mode: a plain white bar with white/near-white active icons would be
// invisible — instead of inverting to black (which would also blank out the
// Messages icon's hard-coded dark dot strokes, drawn expecting a light
// fill), the active fill uses the app's existing brand accent purple
// ("#AC86D4"), already used everywhere else in this app as the
// theme-independent "active" indicator (StoryCarousel's active pill,
// EventFeedCard's follow accent, etc.).
const NAV_BAR_ICON_ACTIVE_LIGHT = "#AC86D4";
const NAV_BAR_BASE_HEIGHT = 72;
const NAV_BAR_MAX_WIDTH = 440;
const NAV_ICON_SIZE = 32;

export default function TabLayout() {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isAddModalOpening, setIsAddModalOpening] = useState(false);
  const addModalOpenLockRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  // A step off pure white (colors.backgroundSecondary) instead of
  // colors.card/background — those equal the page's own white, which is
  // exactly why the bar previously read as floating directly in the feed
  // with no perceptible surface of its own.
  const NAV_BAR_BACKGROUND = isDark ? NAV_BAR_BACKGROUND_DARK : colors.backgroundSecondary;
  const NAV_BAR_ICON_ACTIVE = isDark ? NAV_BAR_ICON_ACTIVE_DARK : NAV_BAR_ICON_ACTIVE_LIGHT;
  const NAV_BAR_ICON_INACTIVE = isDark ? NAV_BAR_ICON_INACTIVE_DARK : colors.textSecondary;
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const tabAvatarUri = user?.avatarKey ? getStorageFileUrl(user.avatarKey) : null;
  const tabAvatarName = user?.name ?? user?.username;
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const incrementUnread = useNotificationStore((state) => state.incrementUnread);
  const unreadMessageConversationCount = useChatUnreadStore((state) => state.unreadDirectConversationCount);
  const clearAllDirectUnread = useChatUnreadStore((state) => state.clearAllDirectUnread);
  const incrementDirectUnread = useChatUnreadStore((state) => state.incrementDirectUnread);
  const setDirectUnreadCountsFromConversations = useChatUnreadStore((state) => state.setDirectUnreadCountsFromConversations);

  useEffect(() => {
    if (!accessToken) {
      setUnreadCount(0);
      clearAllDirectUnread();
      return;
    }

    let isMounted = true;

    const refreshBadgeState = () => {
      getUnreadNotificationCount()
        .then((count) => {
          if (isMounted) {
            setUnreadCount(count);
          }
        })
        .catch(() => {
          // Keep the current badge value if the count request fails.
        });

      getDirectMessageConversations()
        .then((conversations) => {
          if (isMounted) {
            setDirectUnreadCountsFromConversations(conversations);
          }
        })
        .catch(() => {
          // Keep the current chat badge value if the conversation request fails.
        });
    };

    refreshBadgeState();

    // Global subscription on the single shared connection — this fires
    // regardless of which screen is currently open, so the DM badge stays
    // accurate even while browsing Explore/Live/etc. Group messages don't
    // have an unread-badge concept yet, but a reconnect still triggers a
    // fresh REST fetch below so nothing is silently missed.
    const unsubscribe = subscribeRealtime({
      onDirectMessage: (message) => {
        const currentUserId = useAuthStore.getState().user?.id;

        if (currentUserId && message.senderId !== currentUserId) {
          incrementDirectUnread(message.senderId);
        }
      },
      onNotification: (notification) => {
        if (!notification.isRead) {
          incrementUnread();
        }
      },
      onNotificationRead: ({ unreadCount: nextUnreadCount }) => {
        setUnreadCount(nextUnreadCount);
      },
      onNotificationsReadAll: ({ unreadCount: nextUnreadCount }) => {
        setUnreadCount(nextUnreadCount);
      },
      onReconnected: refreshBadgeState,
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [
    accessToken,
    clearAllDirectUnread,
    incrementDirectUnread,
    incrementUnread,
    setDirectUnreadCountsFromConversations,
    setUnreadCount,
  ]);

  const tabBarHeight = NAV_BAR_BASE_HEIGHT + insets.bottom;

  const openAddModal = () => {
    if (addModalOpenLockRef.current) return;

    addModalOpenLockRef.current = true;
    setIsAddModalOpening(true);
    setIsAddModalVisible(true);
  };

  const closeAddModal = () => {
    setIsAddModalVisible(false);
    setIsAddModalOpening(false);
    addModalOpenLockRef.current = false;
  };

  return (
    <>
      <ExpoTabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            alignSelf: "center",
            width: "100%",
            maxWidth: NAV_BAR_MAX_WIDTH,
            backgroundColor: NAV_BAR_BACKGROUND,
            borderTopWidth: 0,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            height: tabBarHeight,
            paddingTop: 16,
            paddingRight: 24,
            paddingBottom: 24 + insets.bottom,
            paddingLeft: 24,
            justifyContent: "space-between",
            alignItems: "center",
            // Dark mode's black bar already stands out against the app's
            // dark background, so it keeps its exact zero-border/
            // zero-shadow treatment. Light mode gets a border plus a subtle
            // upward shadow so the bar reads as a distinct fixed surface
            // instead of floating directly in the scrolling feed.
            ...(isDark
              ? { elevation: 0, shadowOpacity: 0, shadowColor: "transparent" }
              : {
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: "#000000",
                  shadowOpacity: 0.08,
                  shadowOffset: { width: 0, height: -2 },
                  shadowRadius: 8,
                  elevation: 6,
                }),
          },
          tabBarItemStyle: styles.tabBarItem,
          tabBarIconStyle: styles.tabBarIcon,
          tabBarShowLabel: false,
          tabBarActiveTintColor: NAV_BAR_ICON_ACTIVE,
          tabBarInactiveTintColor: NAV_BAR_ICON_INACTIVE,
        }}
      >
        <ExpoTabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              focused ? (
                <Svg width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} viewBox="0 0 32 32" fill="none">
                  <Path d="M29.3327 15.9993C29.3327 8.63555 23.3631 2.66602 15.9993 2.66602C8.63555 2.66602 2.66602 8.63555 2.66602 15.9993C2.66602 23.3631 8.63555 29.3334 15.9993 29.3334C23.3631 29.3334 29.3327 23.3631 29.3327 15.9993Z" fill={NAV_BAR_ICON_ACTIVE} />
                  <Path d="M16.5359 11.0646L20.4291 9.76685C21.6107 9.37297 22.2016 9.17603 22.5135 9.48791C22.8253 9.79979 22.6284 10.3906 22.2344 11.5723L20.9367 15.4655C20.2655 17.4791 19.9299 18.4859 19.2079 19.2079C18.4859 19.9299 17.4791 20.2655 15.4655 20.9367L11.5723 22.2344C10.3906 22.6284 9.79979 22.8253 9.48791 22.5135C9.17603 22.2016 9.37297 21.6107 9.76685 20.4291L11.0646 16.5359C11.7358 14.5223 12.0714 13.5155 12.7934 12.7934C13.5155 12.0714 14.5223 11.7358 16.5359 11.0646Z" fill={NAV_BAR_BACKGROUND} />
                  <Path d="M16.166 15.9993H15.9993M16.3327 15.9993C16.3327 16.1835 16.1835 16.3327 15.9993 16.3327C15.8152 16.3327 15.666 16.1835 15.666 15.9993C15.666 15.8152 15.8152 15.666 15.9993 15.666C16.1835 15.666 16.3327 15.8152 16.3327 15.9993Z" stroke={NAV_BAR_ICON_ACTIVE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              ) : (
                <Svg width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} viewBox="0 0 32 32" fill="none">
                  <Path d="M29.3327 15.9993C29.3327 8.63555 23.3631 2.66602 15.9993 2.66602C8.63555 2.66602 2.66602 8.63555 2.66602 15.9993C2.66602 23.3631 8.63555 29.3334 15.9993 29.3334C23.3631 29.3334 29.3327 23.3631 29.3327 15.9993Z" stroke={NAV_BAR_ICON_INACTIVE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M16.5359 11.0646L20.4291 9.76685C21.6107 9.37297 22.2016 9.17603 22.5135 9.48791C22.8253 9.79979 22.6284 10.3906 22.2344 11.5723L20.9367 15.4655C20.2655 17.4791 19.9299 18.4859 19.2079 19.2079C18.4859 19.9299 17.4791 20.2655 15.4655 20.9367L11.5723 22.2344C10.3906 22.6284 9.79979 22.8253 9.48791 22.5135C9.17603 22.2016 9.37297 21.6107 9.76685 20.4291L11.0646 16.5359C11.7358 14.5223 12.0714 13.5155 12.7934 12.7934C13.5155 12.0714 14.5223 11.7358 16.5359 11.0646Z" stroke={NAV_BAR_ICON_INACTIVE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M16.166 15.9993H15.9993M16.3327 15.9993C16.3327 16.1835 16.1835 16.3327 15.9993 16.3327C15.8152 16.3327 15.666 16.1835 15.666 15.9993C15.666 15.8152 15.8152 15.666 15.9993 15.666C16.1835 15.666 16.3327 15.8152 16.3327 15.9993Z" stroke={NAV_BAR_ICON_INACTIVE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
                    <Path d="M11.5048 16.8981H10.8929C8.91458 16.8981 7.92542 16.8981 7.5038 16.2459C7.08217 15.5937 7.4839 14.6851 8.28737 12.8678L10.7029 7.40431C11.4334 5.752 11.7987 4.92584 12.5073 4.46292C13.2159 4 14.1152 4 15.914 4H18.6998C20.8849 4 21.9774 4 22.3894 4.7138C22.8016 5.4276 22.2596 6.38117 21.1754 8.28831L19.7462 10.8025C19.2073 11.7506 18.9378 12.2247 18.9416 12.6127C18.9465 13.117 19.2146 13.5816 19.6478 13.836C19.9812 14.0319 20.5242 14.0319 21.6105 14.0319C22.9837 14.0319 23.6704 14.0319 24.028 14.2696C24.4925 14.5784 24.7357 15.1309 24.6505 15.6843C24.5849 16.1101 24.123 16.6208 23.1993 17.6423L15.8192 25.8031C14.3696 27.406 13.6448 28.2075 13.1581 27.9539C12.6714 27.7001 12.9051 26.6429 13.3725 24.5283L14.2882 20.3861C14.6441 18.776 14.8221 17.9709 14.3941 17.4345C13.9661 16.8981 13.1457 16.8981 11.5048 16.8981Z" fill={NAV_BAR_ICON_ACTIVE} />
                  </Svg>
                ) : (
                  <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <Path d="M11.5048 16.8981H10.8929C8.91458 16.8981 7.92542 16.8981 7.5038 16.2459C7.08217 15.5937 7.4839 14.6851 8.28737 12.8678L10.7029 7.40431C11.4334 5.752 11.7987 4.92584 12.5073 4.46292C13.2159 4 14.1152 4 15.914 4H18.6998C20.8849 4 21.9774 4 22.3894 4.7138C22.8016 5.4276 22.2596 6.38117 21.1754 8.28831L19.7462 10.8025C19.2073 11.7506 18.9378 12.2247 18.9416 12.6127C18.9465 13.117 19.2146 13.5816 19.6478 13.836C19.9812 14.0319 20.5242 14.0319 21.6105 14.0319C22.9837 14.0319 23.6704 14.0319 24.028 14.2696C24.4925 14.5784 24.7357 15.1309 24.6505 15.6843C24.5849 16.1101 24.123 16.6208 23.1993 17.6423L15.8192 25.8031C14.3696 27.406 13.6448 28.2075 13.1581 27.9539C12.6714 27.7001 12.9051 26.6429 13.3725 24.5283L14.2882 20.3861C14.6441 18.776 14.8221 17.9709 14.3941 17.4345C13.9661 16.8981 13.1457 16.8981 11.5048 16.8981Z" stroke={NAV_BAR_ICON_INACTIVE} strokeWidth={2} strokeLinejoin="round" />
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
            tabBarIcon: ({ color }) => isAddModalOpening
              ? <ActivityIndicator size={NAV_ICON_SIZE} color={color} />
              : <Feather name="plus-circle" size={NAV_ICON_SIZE} color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openAddModal();
            },
          }}
        />
      <ExpoTabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              {focused ? (
                <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <Path d="M28.6673 16.0007C28.6673 22.9963 22.9963 28.6673 16.0007 28.6673C13.8299 28.6673 11.7865 28.1212 10.0007 27.1589C7.50968 25.8167 5.83348 27.0645 4.35521 27.2884C4.13097 27.3224 3.90764 27.2409 3.74728 27.0807C3.50386 26.8372 3.45753 26.4608 3.59198 26.1439C4.17218 24.7764 4.70492 22.1849 3.97853 20.0007C3.56038 18.7433 3.33398 17.3984 3.33398 16.0007C3.33398 9.00504 9.00504 3.33398 16.0007 3.33398C22.9963 3.33398 28.6673 9.00504 28.6673 16.0007Z" fill={NAV_BAR_ICON_ACTIVE} />
                  <Path d="M16.1683 15.9993H16.0016M10.834 15.9993H10.6673M21.5007 15.9993H21.334M16.3349 15.9993C16.3349 16.1835 16.1857 16.3327 16.0016 16.3327C15.8176 16.3327 15.6683 16.1835 15.6683 15.9993C15.6683 15.8152 15.8176 15.666 16.0016 15.666C16.1857 15.666 16.3349 15.8152 16.3349 15.9993ZM11.0007 15.9993C11.0007 16.1835 10.8514 16.3327 10.6673 16.3327C10.4832 16.3327 10.334 16.1835 10.334 15.9993C10.334 15.8152 10.4832 15.666 10.6673 15.666C10.8514 15.666 11.0007 15.8152 11.0007 15.9993ZM21.6673 15.9993C21.6673 16.1835 21.5181 16.3327 21.334 16.3327C21.1499 16.3327 21.0007 16.1835 21.0007 15.9993C21.0007 15.8152 21.1499 15.666 21.334 15.666C21.5181 15.666 21.6673 15.8152 21.6673 15.9993Z" stroke="#111111" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              ) : (
                <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <Path d="M28.6673 16.0007C28.6673 22.9963 22.9963 28.6673 16.0007 28.6673C13.8299 28.6673 11.7865 28.1212 10.0007 27.1589C7.50968 25.8167 5.83348 27.0645 4.35521 27.2884C4.13097 27.3224 3.90764 27.2409 3.74728 27.0807C3.50386 26.8372 3.45753 26.4608 3.59198 26.1439C4.17218 24.7764 4.70492 22.1849 3.97853 20.0007C3.56038 18.7433 3.33398 17.3984 3.33398 16.0007C3.33398 9.00504 9.00504 3.33398 16.0007 3.33398C22.9963 3.33398 28.6673 9.00504 28.6673 16.0007Z" stroke={NAV_BAR_ICON_INACTIVE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M16.1683 15.9993H16.0016M10.834 15.9993H10.6673M21.5007 15.9993H21.334M16.3349 15.9993C16.3349 16.1835 16.1857 16.3327 16.0016 16.3327C15.8176 16.3327 15.6683 16.1835 15.6683 15.9993C15.6683 15.8152 15.8176 15.666 16.0016 15.666C16.1857 15.666 16.3349 15.8152 16.3349 15.9993ZM11.0007 15.9993C11.0007 16.1835 10.8514 16.3327 10.6673 16.3327C10.4832 16.3327 10.334 16.1835 10.334 15.9993C10.334 15.8152 10.4832 15.666 10.6673 15.666C10.8514 15.666 11.0007 15.8152 11.0007 15.9993ZM21.6673 15.9993C21.6673 16.1835 21.5181 16.3327 21.334 16.3327C21.1499 16.3327 21.0007 16.1835 21.0007 15.9993C21.0007 15.8152 21.1499 15.666 21.334 15.666C21.5181 15.666 21.6673 15.8152 21.6673 15.9993Z" stroke={NAV_BAR_ICON_INACTIVE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
              {unreadMessageConversationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadMessageConversationCount > 9 ? "9+" : unreadMessageConversationCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <ExpoTabs.Screen
        name="profile"
        options={{
          tabBarIcon: () => (
            <View style={styles.profileAvatar}>
              <UserAvatar uri={tabAvatarUri} name={tabAvatarName} size={NAV_ICON_SIZE} />
            </View>
          ),
        }}
      />
      </ExpoTabs>

      <AddOptionsModal 
        visible={isAddModalVisible} 
        onClose={closeAddModal}
        onOpenComplete={() => setIsAddModalOpening(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarItem: {
    width: 64,
    maxWidth: 64,
    height: NAV_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flex: 0,
  },
  tabBarIcon: {
    width: 64,
    height: NAV_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatar: {
    width: NAV_ICON_SIZE,
    height: NAV_ICON_SIZE,
    borderRadius: NAV_ICON_SIZE / 2,
    borderWidth: 0.666667,
    borderColor: "rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
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


