import { Feather } from "@expo/vector-icons";
import { UploadCircle01Icon, ViewIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, KeyboardAvoidingView, Platform, Image, ImageBackground, Alert } from "react-native";

type AddProductModalProps = {
  visible: boolean;
  onClose: () => void;
  initialData?: {
    name: string;
    description: string;
    price: string;
    discount: string;
    stock: string;
    tag: string;
    images: string[];
  };
};

const InputLabel = ({ label, sublabel }: { label: string; sublabel?: string }) => (
  <View style={styles.labelContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
  </View>
);

export default function AddProductModal({ visible, onClose, initialData }: AddProductModalProps) {
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price || '');
  const [discount, setDiscount] = useState(initialData?.discount || '');
  const [stock, setStock] = useState(initialData?.stock || '');
  const [tag, setTag] = useState(initialData?.tag || '');
  
  const router = useRouter();

  // Reset state when modal opens with new data
  React.useEffect(() => {
    if (visible) {
      setImages(initialData?.images || []);
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setPrice(initialData?.price || '');
      setDiscount(initialData?.discount || '');
      setStock(initialData?.stock || '');
      setTag(initialData?.tag || '');
    }
  }, [visible, initialData]);

  const handlePublish = () => {
    // Logic for publishing/saving (mocked)
    onClose();
    if (!initialData) {
      router.push('/profile-screen/inventory');
    }
  };

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'We need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map(asset => asset.uri);
      setImages([...images, ...newUris]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

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
            <Text style={styles.headerTitle}>{initialData ? 'Edit Product' : 'Add Product'}</Text>
            <View style={{ width: 40 }} /> 
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Image Upload */}
            <InputLabel label="IMAGE" />
            
            {images.length > 0 ? (
              <View style={styles.galleryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                  {images.map((uri, index) => (
                    <ImageBackground 
                      key={index} 
                      source={{ uri }} 
                      style={styles.thumbnail}
                      imageStyle={{ borderRadius: 12 }}
                    >
                      <View style={styles.thumbOverlay}>
                        <TouchableOpacity style={styles.thumbAction}>
                          <HugeiconsIcon icon={ViewIcon} size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.thumbAction} onPress={() => removeImage(index)}>
                          <HugeiconsIcon icon={Delete02Icon} size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </ImageBackground>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.uploadBtnSmall} onPress={handleUpload}>
                  <HugeiconsIcon icon={UploadCircle01Icon} size={20} color="#0e0d12" />
                  <Text style={styles.uploadBtnText}>Upload Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7} onPress={handleUpload}>
                <Text style={styles.uploadHint}>You can upload multiple images</Text>
                <View style={styles.uploadBtn}>
                  <HugeiconsIcon icon={UploadCircle01Icon} size={20} color="#0e0d12" />
                  <Text style={styles.uploadBtnText}>Upload Image</Text>
                </View>
                <Text style={styles.fileHint}>JPEG, or PNG</Text>
              </TouchableOpacity>
            )}

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
              value={name}
              onChangeText={setName}
            />

            {/* Description */}
            <InputLabel label="DESCRIPTION" />
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Detail about ticket" 
              placeholderTextColor="#555"
              multiline
              value={description}
              onChangeText={setDescription}
            />

            {/* Set Tag */}
            <InputLabel label="SET TAG" sublabel="You can only set one tag for your product" />
            <TextInput 
              style={styles.input} 
              placeholder="Skin Care" 
              placeholderTextColor="#555"
              value={tag}
              onChangeText={setTag}
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
                    value={price}
                    onChangeText={setPrice}
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
                    value={discount}
                    onChangeText={setDiscount}
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
              value={stock}
              onChangeText={setStock}
            />

            {/* Actions */}
            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
                <Text style={styles.publishText}>{initialData ? 'Save Changes' : 'Publish'}</Text>
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
  galleryContainer: {
    alignItems: 'center',
    gap: 15,
  },
  thumbScroll: {
    width: '100%',
  },
  thumbnail: {
    width: 100,
    height: 100,
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  thumbAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B2ABBA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'center',
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
