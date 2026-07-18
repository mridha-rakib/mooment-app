import UserAvatar from "@/components/ui/UserAvatar";
import type { EventResponse } from "@/lib/events";
import { getStorageFileUrl } from "@/lib/storage";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

type PublicGoingSummary = EventResponse["publicGoingSummary"];

type PublicGoingSummaryRowProps = {
  eventId?: string | null;
  eventName?: string | null;
  summary?: PublicGoingSummary;
  canViewCreatorList?: boolean;
  trailingText?: string | null;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  separatorStyle?: StyleProp<TextStyle>;
  trailingTextStyle?: StyleProp<TextStyle>;
};

export const hasValidPublicGoingSummary = (summary?: PublicGoingSummary): summary is NonNullable<PublicGoingSummary> =>
  typeof summary?.going === "number" &&
  Number.isFinite(summary.going) &&
  Array.isArray(summary.avatars);

export default function PublicGoingSummaryRow({
  eventId,
  eventName,
  summary,
  canViewCreatorList = false,
  trailingText,
  style,
  textStyle,
  separatorStyle,
  trailingTextStyle,
}: PublicGoingSummaryRowProps) {
  if (!hasValidPublicGoingSummary(summary)) {
    return trailingText ? (
      <View style={[styles.row, style]}>
        <Text style={[styles.text, textStyle, trailingTextStyle]} numberOfLines={1}>
          {trailingText}
        </Text>
      </View>
    ) : null;
  }

  const avatars = summary.avatars.slice(0, 3);

  const goToGoingList = () => {
    const id = eventId?.trim();

    if (!id) {
      return;
    }

    router.push({
      pathname: "/profile-screen/attendee-list",
      params: {
        eventId: id,
        eventName: eventName ?? "Event",
        initialFilter: "going",
        ...(canViewCreatorList ? {} : { mode: "publicGoing" }),
      },
    });
  };

  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        style={styles.goingPressable}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`${summary.going} going`}
        hitSlop={4}
        onPress={goToGoingList}
      >
        {avatars.length > 0 ? (
          <View style={[styles.avatarStack, { width: 20 + (avatars.length - 1) * 12 }]}>
            {avatars.map((avatar, index) => {
              const avatarUri = avatar.avatarKey
                ? (() => {
                  try { return getStorageFileUrl(avatar.avatarKey); } catch { return null; }
                })()
                : null;

              return (
                <View
                  key={avatar.userId}
                  style={[
                    styles.avatarItem,
                    index > 0 ? styles.avatarOverlap : null,
                    { zIndex: avatars.length - index },
                  ]}
                >
                  <UserAvatar uri={avatarUri} name={avatar.name} size={20} />
                </View>
              );
            })}
          </View>
        ) : null}
        <Text style={[styles.text, textStyle]} numberOfLines={1}>
          {summary.going} going
        </Text>
      </TouchableOpacity>
      {trailingText ? (
        <>
          <Text style={[styles.separator, textStyle, separatorStyle]}>•</Text>
          <Text style={[styles.text, textStyle, trailingTextStyle]} numberOfLines={1}>
            {trailingText}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    maxWidth: "100%",
  },
  goingPressable: {
    height: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  avatarStack: {
    height: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarItem: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: -0.08,
  },
  separator: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
});
