import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ProfileBioProps = {
  name: string;
  handle: string;
  bio: string;
  isOwnProfile?: boolean;
  actions?: React.ReactNode;
};

export default function ProfileBio({ name, handle, bio, isOwnProfile = true, actions }: ProfileBioProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.nameCol}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.handle, { color: colors.textSecondary }]}>{handle}</Text>
        </View>
        {!isOwnProfile && actions && (
          <View style={styles.actionsCol}>
            {actions}
          </View>
        )}
      </View>
      <Text style={[styles.bioText, { color: colors.text }]}>{bio}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameCol: {
    flex: 1,
    marginRight: 10,
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
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
