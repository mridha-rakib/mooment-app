import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, SafeAreaView, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();

  const menuItems = [
    {
      title: "My Tickets",
      icon: <MaterialCommunityIcons name="ticket-outline" size={22} color="#FFFFFF" />,
      route: "/event-screen/wallet",
      subtitle: "Event tickets and passes"
    },
    {
      title: "My Products",
      icon: <Feather name="shopping-bag" size={22} color="#FFFFFF" />,
      route: "/event-screen/product/wallet",
      subtitle: "Purchased items and orders"
    },
    {
      title: "Settings",
      icon: <Feather name="settings" size={22} color="#FFFFFF" />,
      route: "/onboarding-settings",
      subtitle: "Account and app preferences"
    }
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' }} 
              style={styles.avatar} 
            />
            <TouchableOpacity style={styles.editBtn}>
              <Feather name="edit-2" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>Alex Johnson</Text>
          <Text style={styles.userEmail}>alex.j@example.com</Text>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuIconContainer}>
                {item.icon}
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#3F3F46" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color="#FF4B4B" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0e0d12",
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  container: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#13131A',
  },
  editBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#16D869',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0e0d12',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: '#8E8E9B',
    fontSize: 14,
  },
  menuSection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131A',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    color: '#8E8E9B',
    fontSize: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  logoutText: {
    color: '#FF4B4B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
