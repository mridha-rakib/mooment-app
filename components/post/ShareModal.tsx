import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, TextInput, ScrollView, Platform, Dimensions, KeyboardAvoidingView } from 'react-native';
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

type ShareUser = {
  id: string;
  name: string;
  avatar: string;
};

type ShareApp = {
  id: string;
  name: string;
  iconFn: () => React.ReactNode;
};

const MOCK_USERS: ShareUser[] = [
  { id: '1', name: 'dj_karas', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
  { id: '2', name: 'Kudos', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop' },
  { id: '3', name: 'Hamid', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop' },
  { id: '4', name: 'Karas', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop' },
  { id: '5', name: 'Carry', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
  { id: '6', name: 'Sierra', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150&auto=format&fit=crop' },
];

const MOCK_APPS: ShareApp[] = [
  {
    id: 'repost',
    name: 'Repost',
    iconFn: () => <Feather name="repeat" size={24} color="#FFFFFF" />
  },
  {
    id: 'copy',
    name: 'Copy Link',
    iconFn: () => <Feather name="link" size={24} color="#FFFFFF" />
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
  onClose 
}: { 
  visible: boolean; 
  onClose: () => void;
}) {
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
        
        <View style={styles.modalContainer}>
          {/* Grabber */}
          <View style={styles.grabberContainer}>
            <View style={styles.grabber} />
          </View>
          
          <Text style={styles.titleText}>Share to...</Text>
          
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#8E8E9B" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#8E8E9B"
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
                  <View style={styles.avatarRing}>
                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                  </View>
                  <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
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
                <TouchableOpacity key={app.id} style={styles.appItem} activeOpacity={0.8}>
                  <View style={styles.appIconContainer}>
                    {app.iconFn()}
                  </View>
                  <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
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
    backgroundColor: '#13131A',
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
    backgroundColor: '#D0D0D8',
    borderRadius: 2,
  },
  titleText: {
    color: '#FFFFFF',
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
    borderColor: '#454555',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
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
    borderColor: '#F2245C',
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
    borderColor: '#13131A', // creates the gap effect between ring and image
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  appItem: {
    alignItems: 'center',
    width: 72,
  },
  appIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20, // squircle shape
    borderWidth: 1,
    borderColor: '#454555',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: {
    color: '#FFFFFF',
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
