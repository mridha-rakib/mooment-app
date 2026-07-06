import {
  useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import {
  Analytics01Icon,
  Bookmark02Icon,
  Calendar03Icon,
  Logout01Icon,
  Settings02Icon,
  Ticket01Icon,
  UserEdit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { requireBusinessAccountForEvent } from "@/lib/eventGuard";
import { useAuthStore } from "@/stores/authStore";
import { useTicketWalletShortcutStore } from "@/stores/ticketWalletShortcutStore";

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
  colors: any;
};

const MenuItem = ({ icon, label, onPress, isDestructive, colors }: MenuItemProps) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuItemLeft}>
      <HugeiconsIcon icon={icon} size={20} color={isDestructive ? colors.danger || '#FF4B4B' : colors.text} />
      <Text style={[styles.menuItemLabel, { color: colors.text }, isDestructive && { color: colors.danger || '#FF4B4B' }]}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const SectionLabel = ({ label, colors }: { label: string, colors: any }) => (
  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
);

export default function ProfileMenuDrawer({ visible, onClose, onAddProductPress, userName, userHandle }: MenuDrawerProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const isTicketShortcutVisible = useTicketWalletShortcutStore((state) => state.isVisible);
  const restoreTicketShortcut = useTicketWalletShortcutStore((state) => state.restore);
  const hideTicketShortcut = useTicketWalletShortcutStore((state) => state.hide);

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/auth-screen/login');
  };

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

          <ScrollView
            style={styles.menuScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
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
                router.push('/event-screen/event-drafts');
              }}
            />
            {/* 
            <MenuItem 
              icon={Calendar01Icon} 
              label="My Plan" 
              colors={colors} 
              onPress={() => {
                onClose();
                router.push('/profile-screen/my-plan');
              }} 
            />
            */}
            <MenuItem
              icon={Analytics01Icon}
              label="Creator Dashboard"
              colors={colors}
              onPress={() => {
                onClose();
                requireBusinessAccountForEvent({
                  user,
                  completedProfileTypes,
                  updateProfile,
                  router,
                  onReady: () => router.push('/profile-screen/creator-dashboard'),
                });
              }}
            />
            {/* 
            <MenuItem
              icon={ShoppingCart01Icon}
              label="My Cart"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/event-screen/product/cart');
              }}
            />
            */}

            <MenuItem
              icon={Ticket01Icon}
              label="Ticket Wallet"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/event-screen/wallet');
              }}
            />
            <MenuItem
              icon={Ticket01Icon}
              label={isTicketShortcutVisible ? "Hide Wallet Shortcut" : "Show Wallet Shortcut"}
              colors={colors}
              onPress={() => {
                onClose();
                void (isTicketShortcutVisible ? hideTicketShortcut() : restoreTicketShortcut()).catch(() => undefined);
              }}
            />
            {/* Product Wallet is temporarily hidden */}
            {/* 
            <MenuItem
              icon={ShoppingBag01Icon}
              label="Product Wallet"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/event-screen/product/wallet');
              }}
            />
            */}

            {/* PRODUCT section is temporarily hidden */}
            {/* 
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
            />
            */}

            <MenuItem
              icon={Settings02Icon}
              label="Settings"
              colors={colors}
              onPress={() => {
                onClose();
                router.push('/profile-screen/settings');
              }}
            />
            <MenuItem
              icon={Logout01Icon}
              label="Logout"
              colors={colors}
              onPress={handleLogout}
              isDestructive
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
    maxHeight: '92%',
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
  menuScroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 16,
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
});
