import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, Share } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import UserAvatar from '../ui/UserAvatar';

type ShareUser = {
  id: string;
  name: string;
  avatar?: string | null;
};

type ShareApp = {
  id: string;
  name: string;
  iconFn: (colors: any) => React.ReactNode;
};

const MOCK_USERS: ShareUser[] = [
  { id: '1', name: 'dj_karas', avatar: null },
  { id: '2', name: 'Kudos', avatar: null },
  { id: '3', name: 'Hamid', avatar: null },
  { id: '4', name: 'Karas', avatar: null },
  { id: '5', name: 'Carry', avatar: null },
  { id: '6', name: 'Sierra', avatar: null },
];

const MOCK_APPS: ShareApp[] = [
  {
    id: 'repost',
    name: 'Repost',
    iconFn: (colors) => <Feather name="repeat" size={24} color={colors.text} />
  },
  {
    id: 'copy',
    name: 'Copy Link',
    iconFn: (colors) => <Feather name="link" size={24} color={colors.text} />
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    iconFn: () => <Ionicons name="logo-whatsapp" size={26} color="#25D366" />
  },
  {
    id: 'facebook',
    name: 'Facebook',
    iconFn: () => <Ionicons name="logo-facebook" size={26} color="#1877F2" />
  },
  {
    id: 'instagram',
    name: 'Instagram',
    iconFn: () => (
      <View style={styles.instagramIconBg}>
        <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
      </View>
    )
  },
  {
    id: 'x',
    name: 'X',
    iconFn: () => (
      <View style={styles.xIconBg}>
        <Text style={styles.xIconText}>X</Text>
      </View>
    )
  }
];

export default function ShareModal({ 
  visible, 
  onClose,
  onRepost,
  shareUrl,
}: { 
  visible: boolean; 
  onClose: () => void;
  onRepost?: () => Promise<void> | void;
  shareUrl?: string;
}) {
  const { colors } = useTheme();
  const [isReposting, setIsReposting] = useState(false);

  const handleAppPress = async (appId: string) => {
    if (appId === 'repost') {
      if (!onRepost || isReposting) {
        return;
      }

      setIsReposting(true);

      try {
        await onRepost();
      } finally {
        setIsReposting(false);
      }

      return;
    }

    try {
      await Share.share({
        message: shareUrl ?? 'https://mooment.app',
        url: shareUrl,
      });
    } catch {
      // The native share sheet reports cancellation and platform failures here.
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backgroundDismiss} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          {/* Grabber */}
          <View style={styles.grabberContainer}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          </View>
          
          <Text style={[styles.titleText, { color: colors.text }]}>Share to...</Text>
          
          {/* Search Input */}
          <View style={[styles.searchContainer, { borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput 
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Users List */}
          <View style={styles.sectionContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {MOCK_USERS.map((user) => (
                <TouchableOpacity key={user.id} style={styles.userItem} activeOpacity={0.8}>
                  <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
                    <UserAvatar uri={user.avatar} name={user.name} size={52} style={[styles.avatarImage, { borderColor: colors.card }]} />
                  </View>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Apps/Actions List */}
          <View style={[styles.sectionContainer, { marginBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {MOCK_APPS.map((app) => (
                <TouchableOpacity
                  key={app.id}
                  style={[styles.appItem, app.id === 'repost' && isReposting && styles.appItemDisabled]}
                  activeOpacity={0.8}
                  onPress={() => handleAppPress(app.id)}
                  disabled={app.id === 'repost' && isReposting}
                >
                  <View style={[styles.appIconContainer, { borderColor: colors.border }]}>
                    {app.iconFn(colors)}
                  </View>
                  <Text style={[styles.appName, { color: colors.text }]} numberOfLines={1}>
                    {app.id === 'repost' && isReposting ? 'Posting...' : app.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(58, 58, 58, 0.7)', 
  },
  backgroundDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  horizontalScrollContent: {
    paddingHorizontal: 12,
  },
  userItem: {
    alignItems: 'center',
    width: 72, // Fixed width to ensure text centering
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },
  userName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  appItem: {
    alignItems: 'center',
    width: 72,
  },
  appItemDisabled: {
    opacity: 0.55,
  },
  appIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20, // squircle shape
    borderWidth: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Custom Icon styles
  instagramIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E1306C', // Simplified Instagram gradient
    justifyContent: 'center',
    alignItems: 'center',
  },
  xIconBg: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xIconText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
  }
});
