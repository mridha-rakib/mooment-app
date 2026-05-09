import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type MoreMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onReport?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  top?: number;
};

export default function MoreMenuModal({ 
  visible, 
  onClose, 
  onReport, 
  onSave, 
  onDelete,
  showDelete = false,
  top
}: MoreMenuModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, top !== undefined && styles.alignTopRight]}>
          <View style={[styles.menuContainer, top !== undefined && { marginTop: top }]}>
            <Text style={[styles.menuLabel, { color: colors.textSecondary }]}>more</Text>
            
            <View style={[styles.menuContent, { backgroundColor: colors.card }]}>
              {onReport && (
                <>
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    activeOpacity={0.7} 
                    onPress={() => {
                      onReport?.();
                      onClose();
                    }}
                  >
                    <Feather name="flag" size={20} color={colors.text} style={styles.menuIcon} />
                    <Text style={[styles.menuText, { color: colors.text }]}>Report</Text>
                  </TouchableOpacity>
                  {(onSave || (showDelete && onDelete)) && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                </>
              )}

              {onSave && (
                <>
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    activeOpacity={0.7} 
                    onPress={() => {
                      onSave?.();
                      onClose();
                    }}
                  >
                    <Feather name="bookmark" size={20} color={colors.text} style={styles.menuIcon} />
                    <Text style={[styles.menuText, { color: colors.text }]}>Save</Text>
                  </TouchableOpacity>
                  {showDelete && onDelete && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                </>
              )}

              {showDelete && onDelete && (
                <TouchableOpacity 
                  style={styles.menuItem} 
                  activeOpacity={0.7} 
                  onPress={() => {
                    onDelete?.();
                    onClose();
                  }}
                >
                  <Feather name="trash-2" size={20} color={colors.primary} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: colors.primary }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignTopRight: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  menuContainer: {
    width: 180,
  },
  menuLabel: {
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginHorizontal: 0,
  },
});
