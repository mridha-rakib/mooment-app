import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ProfileBioProps = {
  name: string;
  handle: string;
  bio: string;
};

export default function ProfileBio({ name, handle, bio }: ProfileBioProps) {
  return (
    <View style={styles.container}>
      {/* <Text style={styles.name}>{name}</Text> */}
      <Text style={styles.handle}>{handle}</Text>
      <Text style={styles.bioText}>{bio}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  handle: {
    color: '#8E8E9B',
    fontSize: 13,
    marginTop: 2,
  },
  bioText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
