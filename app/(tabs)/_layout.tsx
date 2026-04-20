import React from "react";
// Re-implementing with expo-router
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { Tabs as ExpoTabs } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <ExpoTabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0e0d12",
          borderTopWidth: 1,
          borderTopColor: "#1A1A22",
          height: 80,
          paddingTop: 12,
          paddingBottom: 24,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#8E8E9B",
      }}
    >
      <ExpoTabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color }) => <Feather name="compass" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color }) => <FontAwesome5 name="bolt" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="add"
        options={{
          tabBarIcon: ({ color }) => <Feather name="plus-circle" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color }) => <Feather name="message-square" size={24} color={color} />,
        }}
      />
      <ExpoTabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.profileAvatar, focused && styles.profileAvatarActive]}>
              <Image 
                source={{ uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop" }} 
                style={styles.profileImage} 
              />
            </View>
          ),
        }}
      />
    </ExpoTabs>
  );
}

const styles = StyleSheet.create({
  profileAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    overflow: "hidden",
    marginTop: -2,
  },
  profileAvatarActive: {
    borderColor: "#FFFFFF",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  }
});
