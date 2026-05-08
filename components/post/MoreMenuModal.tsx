import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

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
            <Text style={styles.menuLabel}>more</Text>
            
            <View style={styles.menuContent}>
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
                    <Feather name="flag" size={20} color="#FFFFFF" style={styles.menuIcon} />
                    <Text style={styles.menuText}>Report</Text>
                  </TouchableOpacity>
                  {(onSave || (showDelete && onDelete)) && <View style={styles.separator} />}
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
                    <Feather name="bookmark" size={20} color="#FFFFFF" style={styles.menuIcon} />
                    <Text style={styles.menuText}>Save</Text>
                  </TouchableOpacity>
                  {showDelete && onDelete && <View style={styles.separator} />}
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
                  <Feather name="trash-2" size={20} color="#FFFFFF" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Delete</Text>
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
    color: '#8E8E9B',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuContent: {
    backgroundColor: '#333333',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 0,
  },
});
