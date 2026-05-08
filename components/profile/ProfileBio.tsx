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
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.nameCol}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.handle}>{handle}</Text>
        </View>
        {!isOwnProfile && actions && (
          <View style={styles.actionsCol}>
            {actions}
          </View>
        )}
      </View>
      <Text style={styles.bioText}>{bio}</Text>
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  handle: {
    color: '#8E8E9B',
    fontSize: 13,
    marginTop: 1,
  },
  bioText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
