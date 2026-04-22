import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const OPTIONS = [
  {
    key: 'Public',
    icon: 'globe' as const,
    label: 'Public',
    description: 'Anyone on or off Xenog can see this',
  },
  {
    key: 'Friends',
    icon: 'users' as const,
    label: 'Friends',
    description: 'Only your friends can see this',
  },
  {
    key: 'Only Me',
    icon: 'lock' as const,
    label: 'Only Me',
    description: 'Only you can see this post',
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (audience: string) => void;
  current: string;
};

export default function AudiencePickerModal({ visible, onClose, onSelect, current }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Who can see this?</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Feather name="x" size={22} color="#8E8E9B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Your post will appear on your profile and in feeds. The audience you choose here also applies to comments and likes.
          </Text>

          {OPTIONS.map((opt, i) => {
            const isActive = current === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionRow, i < OPTIONS.length - 1 && styles.optionBorder, isActive && styles.optionRowActive]}
                onPress={() => onSelect(opt.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                  <Feather name={opt.icon} size={20} color={isActive ? '#0e0d12' : '#D4B0EB'} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>{opt.label}</Text>
                  <Text style={styles.optionDesc}>{opt.description}</Text>
                </View>
                <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                  {isActive && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: Platform.OS === 'ios' ? 34 : 20 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#13131A', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A3A', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  subtitle: { color: '#8E8E9B', fontSize: 13, lineHeight: 19, paddingHorizontal: 20, marginBottom: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  optionRowActive: { backgroundColor: 'rgba(212,176,235,0.06)' },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: '#1A1A2E' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(212,176,235,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  iconWrapActive: { backgroundColor: '#D4B0EB' },
  optionText: { flex: 1 },
  optionLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 15, marginBottom: 3 },
  optionLabelActive: { color: '#D4B0EB' },
  optionDesc: { color: '#8E8E9B', fontSize: 12, lineHeight: 17 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#454555', justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: '#D4B0EB' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D4B0EB' },
});
