import { Feather } from "@expo/vector-icons";
import { 
  UserEdit01Icon, 
  Bookmark02Icon, 
  Calendar03Icon, 
  Calendar01Icon, 
  Analytics01Icon, 
  StripeIcon, 
  BitcoinIcon, 
  Wallet01Icon, 
  Ticket01Icon, 
  ShoppingBag01Icon, 
  Add01Icon, 
  Archive01Icon, 
  Settings02Icon, 
  Logout01Icon 
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, SafeAreaView } from "react-native";

type MenuDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onAddProductPress: () => void;
  userName: string;
  userHandle: string;
};

type MenuItemProps = {
  icon: any;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
};

const MenuItem = ({ icon, label, onPress, isDestructive }: MenuItemProps) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuItemLeft}>
      <HugeiconsIcon icon={icon} size={22} color={isDestructive ? '#FF4B4B' : '#FFFFFF'} />
      <Text style={[styles.menuItemLabel, isDestructive && { color: '#FF4B4B' }]}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const SectionLabel = ({ label }: { label: string }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

export default function ProfileMenuDrawer({ visible, onClose, onAddProductPress, userName, userHandle }: MenuDrawerProps) {
  const router = useRouter();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userHandle}>{userHandle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <BlurView intensity={20} tint="dark" style={styles.closeCircle}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <SectionLabel label="ESSENTIALS" />
            <MenuItem 
              icon={UserEdit01Icon} 
              label="Edit Profile" 
              onPress={() => {
                onClose();
                router.push('/profile-screen/edit-profile');
              }} 
            />
            <MenuItem icon={Bookmark02Icon} label="Saved Posts" onPress={() => {}} />
            <MenuItem icon={Calendar03Icon} label="Draft Events" onPress={() => {}} />
            <MenuItem icon={Calendar01Icon} label="My Plan" onPress={() => {}} />
            <MenuItem 
              icon={Analytics01Icon} 
              label="Creator Dashboard" 
              onPress={() => {
                onClose();
                router.push('/profile-screen/creator-dashboard');
              }} 
            />

            <View style={styles.separator} />

            <SectionLabel label="WALLET" />
            <MenuItem 
              icon={StripeIcon} 
              label="Add Stripe Account" 
              onPress={() => {
                onClose();
                router.push('/profile-screen/add-stripe');
              }} 
            />
            <MenuItem 
              icon={BitcoinIcon} 
              label="Buy Mooment Credits" 
              onPress={() => {
                onClose();
                router.push('/profile-screen/buy-credits');
              }} 
            />
            <MenuItem icon={Wallet01Icon} label="Mooment Wallet" onPress={() => {}} />
            <MenuItem icon={Ticket01Icon} label="Ticket Wallet" onPress={() => {}} />
            <MenuItem icon={ShoppingBag01Icon} label="Product Wallet" onPress={() => {}} />

            <View style={styles.separator} />

            <SectionLabel label="PRODUCT" />
            <MenuItem icon={Add01Icon} label="Add Product" onPress={onAddProductPress} />
            <MenuItem icon={Archive01Icon} label="My Inventory" onPress={() => {}} />

            <View style={styles.separator} />

            <MenuItem 
              icon={Settings02Icon} 
              label="Settings" 
              onPress={() => {
                onClose();
                router.push('/profile-screen/settings');
              }} 
            />
            <MenuItem icon={Logout01Icon} label="Logout" onPress={() => {}} isDestructive />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    backgroundColor: '#0e0d12',
    height: '92%',
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userHandle: {
    color: '#8E8E9B',
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {},
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: '#8E8E9B',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 15,
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  menuItemLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#1A1A22',
    marginTop: 10,
  },
});
