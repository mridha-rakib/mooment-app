import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import FadeInOnReady from "../ui/FadeInOnReady";
import { ProfileIdentityTextSkeleton } from "./ProfileSkeletons";

type ProfileBioProps = {
  name: string;
  handle: string;
  bio: string;
  accountType?: "personal" | "business";
  isOwnProfile?: boolean;
  actions?: React.ReactNode;
  identityLoading?: boolean;
};

export default function ProfileBio({
  name,
  handle,
  bio,
  accountType,
  isOwnProfile = true,
  actions,
  identityLoading = false,
}: ProfileBioProps) {
  const { colors } = useTheme();
  // const isBusiness = accountType === "business";

  if (identityLoading) {
    return (
      <View style={styles.container}>
        <ProfileIdentityTextSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FadeInOnReady>
        <View style={styles.topRow}>
          <View style={styles.nameCol}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
              {/* {isBusiness && ( <BlurView intensity={30} tint="default" style={styles.businessBadge} accessibilityLabel="Business Account" accessibilityRole="image" > <View style={styles.badgeOverlay} /> <HugeiconsIcon icon={Store01Icon} size={12} color="#FFFFFF" /> </BlurView> )} */}
            </View>
            <Text style={[styles.handle, { color: colors.textSecondary }]}>
              {handle}
            </Text>
          </View>
          {!isOwnProfile && actions && (
            <View style={styles.actionsCol}>{actions}</View>
          )}
        </View>
        <Text style={[styles.bioText, { color: colors.text }]}>{bio}</Text>
      </FadeInOnReady>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  nameCol: {
    flex: 1,
    marginRight: 10,
  },
  actionsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  businessBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  badgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  handle: {
    fontSize: 13,
    marginTop: 1,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
