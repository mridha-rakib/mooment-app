import { Feather } from "@expo/vector-icons";
import { ImageUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from 'expo-blur';
import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";

type AddProductModalProps = {
  visible: boolean;
  onClose: () => void;
};

const InputLabel = ({ label, sublabel }: { label: string; sublabel?: string }) => (
  <View style={styles.labelContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
  </View>
);

export default function AddProductModal({ visible, onClose }: AddProductModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <View style={styles.closeCircle}>
                <Feather name="x" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Product</Text>
            <View style={{ width: 40 }} /> 
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Image Upload */}
            <InputLabel label="IMAGE" />
            <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
              <Text style={styles.uploadHint}>You can upload multiple images</Text>
              <View style={styles.uploadBtn}>
                <HugeiconsIcon icon={ImageUploadIcon} size={20} color="#0e0d12" />
                <Text style={styles.uploadBtnText}>Upload Image</Text>
              </View>
              <Text style={styles.fileHint}>JPEG, or PNG</Text>
            </TouchableOpacity>

            {/* Category */}
            <InputLabel label="CATEGORY" />
            <TouchableOpacity style={styles.dropdown} activeOpacity={0.8}>
              <Text style={styles.dropdownText}>Select Category</Text>
              <Feather name="chevron-down" size={20} color="#8E8E9B" />
            </TouchableOpacity>

            {/* Product Name */}
            <InputLabel label="PRODUCT NAME" />
            <TextInput 
              style={styles.input} 
              placeholder="Name" 
              placeholderTextColor="#555"
            />

            {/* Description */}
            <InputLabel label="DESCRIPTION" />
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Detail about ticket" 
              placeholderTextColor="#555"
              multiline
            />

            {/* Set Tag */}
            <InputLabel label="SET TAG" sublabel="You can only set one tag for your product" />
            <TextInput 
              style={styles.input} 
              placeholder="Skin Care" 
              placeholderTextColor="#555"
            />

            {/* Price & Discount */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputLabel label="PRICE" />
                <View style={styles.inputWithIcon}>
                  <Text style={styles.iconPrefix}>$</Text>
                  <TextInput 
                    style={styles.flexInput} 
                    placeholder="185" 
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <InputLabel label="DISCOUNT" />
                <View style={styles.inputWithIcon}>
                  <Text style={styles.iconPrefix}>%</Text>
                  <TextInput 
                    style={styles.flexInput} 
                    placeholder="0" 
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Total Product */}
            <InputLabel label="TOTAL PRODUCT" />
            <TextInput 
              style={styles.input} 
              placeholder="185" 
              placeholderTextColor="#555"
              keyboardType="numeric"
            />

            {/* Actions */}
            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.publishBtn}>
                <Text style={styles.publishText}>Publish</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeBtn: {},
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  labelContainer: {
    marginTop: 20,
    marginBottom: 8,
  },
  inputLabel: {
    color: '#8E8E9B',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sublabel: {
    color: '#555',
    fontSize: 11,
    marginTop: 4,
  },
  uploadBox: {
    width: '100%',
    height: 160,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#13131A',
  },
  uploadHint: {
    color: '#8E8E9B',
    fontSize: 13,
    marginBottom: 15,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B2ABBA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  uploadBtnText: {
    color: '#0e0d12',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fileHint: {
    color: '#555',
    fontSize: 11,
    marginTop: 10,
  },
  dropdown: {
    backgroundColor: '#1C1C24',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#8E8E9B',
    fontSize: 15,
  },
  input: {
    backgroundColor: '#1C1C24',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C24',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  iconPrefix: {
    color: '#555',
    fontSize: 16,
    marginRight: 8,
  },
  flexInput: {
    flex: 1,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 15,
  },
  footerActions: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 15,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C1C24',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  publishBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#B2ABBA',
    borderRadius: 12,
  },
  publishText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
