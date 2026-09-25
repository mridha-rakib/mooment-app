import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { updateMoment, type Moment } from '@/lib/moments';

// Caption-only edit of an existing Post/Moment. Deliberately does not expose
// media, audience, location, or tagging controls — those remain unchanged by
// this flow. Kept separate from the create-post screen (which has no
// existing edit-mode architecture) rather than forcing it into one.
export default function EditPostModal({ visible, onClose, postId, initialCaption, onSaved }: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  initialCaption?: string | null;
  onSaved: (updatedMoment: Moment) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState(initialCaption ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const savingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setCaption(initialCaption ?? '');
    }
  }, [initialCaption, visible]);

  // Tracks the real keyboard height instead of KeyboardAvoidingView, which
  // has a known Android bug (see CommentsModal) where its "height"/"padding"
  // behavior doesn't reliably restore after the keyboard closes inside a
  // Modal, leaving a gap or covering the sheet. iOS uses keyboardWill* for a
  // frame-synced animation; Android only has keyboardDid*.
  useEffect(() => {
    if (!visible) return;

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
      setKeyboardHeight(0);
    };
  }, [visible]);

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const updated = await updateMoment(postId, caption.trim() || null);
      onSaved(updated);
      onClose();
    } catch (error) {
      Alert.alert('Unable to update post', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const sheetBottomPadding = Math.max(insets.bottom + 18, Platform.OS === 'ios' ? 34 : 44);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={isSaving ? () => {} : onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} disabled={isSaving} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: sheetBottomPadding + keyboardHeight }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>Edit Post</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textSecondary}
              maxLength={5000}
              multiline
              editable={!isSaving}
              style={[styles.captionInput, { color: colors.text, borderColor: colors.border }]}
            />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, { borderColor: colors.border }]} disabled={isSaving} onPress={onClose}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]} disabled={isSaving} onPress={handleSave}>
                {isSaving ? <ActivityIndicator color="#111" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 11, paddingHorizontal: 20, maxHeight: '84%' },
  grabber: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  content: { flexGrow: 1 },
  captionInput: { minHeight: 110, maxHeight: 220, borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  button: { flex: 1, height: 46, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveButton: { borderWidth: 0 },
  saveButtonText: { color: '#111', fontSize: 14, fontWeight: '800' },
});
