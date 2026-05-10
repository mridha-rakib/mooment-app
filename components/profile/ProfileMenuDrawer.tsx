import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import {
  Add01Icon,
  Analytics01Icon,
  Archive01Icon,
  BitcoinIcon,
  Bookmark02Icon,
  Calendar01Icon,
  Calendar03Icon,
  Logout01Icon,
  Settings02Icon,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
  StripeIcon,
  Ticket01Icon,
  UserEdit01Icon,
  Wallet01Icon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  hideSeparator?: boolean;
  colors: any;
};

const MenuItem = ({ icon, label, onPress, isDestructive, hideSeparator, colors }: MenuItemProps) => (
  <>
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <HugeiconsIcon icon={icon} size={20} color={isDestructive ? colors.danger || '#FF4B4B' : colors.text} />
        <Text style={[styles.menuItemLabel, { color: colors.text }, isDestructive && { color: colors.danger || '#FF4B4B' }]}>{label}</Text>
      </View>
    </TouchableOpacity>
    {!hideSeparator && <View style={[styles.itemSeparator, { backgroundColor: colors.border }]} />}
  </>
);

const SectionLabel = ({ label, colors }: { label: string, colors: any }) => (
  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
);

export default function ProfileMenuDrawer({ visible, onClose, onAddProductPress, userName, userHandle }: MenuDrawerProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.drawerContainer, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
              <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{userHandle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.closeCircle}>
                <Feather name="x" size={20} color={colors.text} />
              </BlurView>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <SectionLabel label="ESSENTIALS" colors={colors} />
            <MenuItem
              icon={UserEdit01Icon}
              label="Edit Profile"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/edit-profile');
              }}
            />
            <MenuItem 
              icon={Bookmark02Icon} 
              label="Saved Posts" 
              colors={colors} 
              onPress={() => {
                onClose();
                router.push('/profile-screen/saved-posts');
              }} 
            />
            <MenuItem
              icon={Calendar03Icon}
              label="Draft Events"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/event-screen/event');
              }}
            />
            <MenuItem 
              icon={Calendar01Icon} 
              label="My Plan" 
              colors={colors} 
              onPress={() => {
                onClose();
                router.push('/profile-screen/my-plan');
              }} 
            />
            <MenuItem
              icon={Analytics01Icon}
              label="Creator Dashboard"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/creator-dashboard');
              }}
            />
            <MenuItem
              icon={ShoppingCart01Icon}
              label="My Cart"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/event-screen/product/cart');
              }}
              hideSeparator
            />

            <SectionLabel label="WALLET" colors={colors} />
            <MenuItem
              icon={StripeIcon}
              label="Add Stripe Account"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/add-stripe');
              }}
            />
            <MenuItem
              icon={BitcoinIcon}
              label="Buy Mooment Credits"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/buy-credits');
              }}
            />
            <MenuItem
              icon={Wallet01Icon}
              label="Mooment Wallet"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/mooment-wallet');
              }}
            />
            <MenuItem
              icon={Ticket01Icon}
              label="Ticket Wallet"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/ticket-wallet');
              }}
            />
            <MenuItem
              icon={ShoppingBag01Icon}
              label="Product Wallet"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/product-wallet');
              }}
              hideSeparator
            />

            <SectionLabel label="PRODUCT" colors={colors} />
            <MenuItem icon={Add01Icon} label="Add Product" colors={colors} onPress={onAddProductPress} />
            <MenuItem
              icon={Archive01Icon}
              label="My Inventory"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/inventory');
              }}
              hideSeparator
            />

            <View style={{ height: 30 }} />

            <MenuItem
              icon={Settings02Icon}
              label="Settings"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/settings');
              }}
              hideSeparator
            />
            <View style={{ height: 10 }} />
            <MenuItem
              icon={Logout01Icon}
              label="Logout"
              colors={colors}
              onPress={() => {
                onClose();
                router.replace('/auth-screen/login');
              }}
              isDestructive
              hideSeparator
            />
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  userHandle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {},
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  sectionLabel: {
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
    fontSize: 14,
    fontWeight: '500',
  },
  itemSeparator: {
    height: 1,
    marginLeft: 37,
  },
});
