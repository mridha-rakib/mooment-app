import {
  Feather } from "@expo/vector-icons";
import { UploadCircle01Icon,
  ViewIcon,
  Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import React,
  { useState } from "react";
import { Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { createProduct } from "@/lib/products";
import { uploadFileToStorage } from "@/lib/storage";

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

const InputLabel = ({ label, sublabel, colors }: { label: string; sublabel?: string; colors: any }) => (
  <View style={styles.labelContainer}>
    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
    {sublabel && <Text style={[styles.sublabel, { color: colors.textSecondary, opacity: 0.7 }]}>{sublabel}</Text>}
  </View>
);

const getImageContentType = (uri: string) => {
  const normalizedUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();

  if (normalizedUri.endsWith(".png")) {
    return "image/png";
  }

  return "image/jpeg";
};

const getImageExtension = (contentType: string) => (contentType === "image/png" ? "png" : "jpg");

const parseNumberInput = (value: string) => Number(value.trim().replace(/,/g, ""));

export default function AddProductModal({ visible, onClose, initialData }: AddProductModalProps) {
  const { colors, isDark } = useTheme();
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price || '');
  const [discount, setDiscount] = useState(initialData?.discount || '');
  const [stock, setStock] = useState(initialData?.stock || '');
  const [tag, setTag] = useState(initialData?.tag || '');
  const [isPublishing, setIsPublishing] = useState(false);
  
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
      setIsPublishing(false);
    }
  }, [visible, initialData]);

  const handlePublish = async () => {
    if (initialData) {
      onClose();
      return;
    }

    if (isPublishing) {
      return;
    }

    const trimmedName = name.trim();
    const priceUsd = parseNumberInput(price);
    const discountPercent = discount.trim() ? parseNumberInput(discount) : 0;
    const totalProduct = parseNumberInput(stock);

    if (!trimmedName) {
      Alert.alert("Add Product", "Product name is required.");
      return;
    }

    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      Alert.alert("Add Product", "Enter a valid product price.");
      return;
    }

    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      Alert.alert("Add Product", "Enter a valid discount between 0 and 100.");
      return;
    }

    if (!Number.isInteger(totalProduct) || totalProduct < 0) {
      Alert.alert("Add Product", "Enter a valid total product count.");
      return;
    }

    setIsPublishing(true);

    try {
      const imageKeys = await Promise.all(
        images.map((uri, index) => {
          const contentType = getImageContentType(uri);
          const extension = getImageExtension(contentType);

          return uploadFileToStorage({
            uri,
            key: `products/${Date.now()}-${index}.${extension}`,
            contentType,
          });
        }),
      );

      await createProduct({
        name: trimmedName,
        description: description.trim() || null,
        tag: tag.trim() || null,
        priceUsd,
        discountPercent,
        totalProduct,
        imageKeys,
      });

      onClose();
      router.push('/profile-screen/inventory');
    } catch (error) {
      Alert.alert(
        "Unable to create product",
        getAuthErrorMessage(error, "Please check the product details and try again."),
      );
    } finally {
      setIsPublishing(false);
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
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <View style={[styles.closeCircle, { backgroundColor: colors.card }]}>
                <Feather name="x" size={20} color={colors.text} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{initialData ? 'Edit Product' : 'Add Product'}</Text>
            <View style={{ width: 40 }} /> 
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Image Upload */}
            <InputLabel label="IMAGE" colors={colors} />
            
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
                <TouchableOpacity style={[styles.uploadBtnSmall, { backgroundColor: colors.primary }]} onPress={handleUpload}>
                  <HugeiconsIcon icon={UploadCircle01Icon} size={20} color={colors.background} />
                  <Text style={[styles.uploadBtnText, { color: colors.background }]}>Upload Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.uploadBox, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7} onPress={handleUpload}>
                <Text style={[styles.uploadHint, { color: colors.textSecondary }]}>You can upload multiple images</Text>
                <View style={[styles.uploadBtn, { backgroundColor: colors.primary }]}>
                  <HugeiconsIcon icon={UploadCircle01Icon} size={20} color={colors.background} />
                  <Text style={[styles.uploadBtnText, { color: colors.background }]}>Upload Image</Text>
                </View>
                <Text style={[styles.fileHint, { color: colors.textSecondary }]}>JPEG, or PNG</Text>
              </TouchableOpacity>
            )}

            {/* Category */}
            <InputLabel label="CATEGORY" colors={colors} />
            <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.card }]} activeOpacity={0.8}>
              <Text style={[styles.dropdownText, { color: colors.textSecondary }]}>Select Category</Text>
              <Feather name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Product Name */}
            <InputLabel label="PRODUCT NAME" colors={colors} />
            <TextInput 
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} 
              placeholder="Name" 
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            {/* Description */}
            <InputLabel label="DESCRIPTION" colors={colors} />
            <TextInput 
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]} 
              placeholder="Detail about ticket" 
              placeholderTextColor={colors.textSecondary}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            {/* Set Tag */}
            <InputLabel label="SET TAG" sublabel="You can only set one tag for your product" colors={colors} />
            <TextInput 
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} 
              placeholder="Skin Care" 
              placeholderTextColor={colors.textSecondary}
              value={tag}
              onChangeText={setTag}
            />

            {/* Price & Discount */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputLabel label="PRICE" colors={colors} />
                <View style={[styles.inputWithIcon, { backgroundColor: colors.card }]}>
                  <Text style={[styles.iconPrefix, { color: colors.textSecondary }]}>$</Text>
                  <TextInput 
                    style={[styles.flexInput, { color: colors.text }]} 
                    placeholder="185" 
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <InputLabel label="DISCOUNT" colors={colors} />
                <View style={[styles.inputWithIcon, { backgroundColor: colors.card }]}>
                  <Text style={[styles.iconPrefix, { color: colors.textSecondary }]}>%</Text>
                  <TextInput 
                    style={[styles.flexInput, { color: colors.text }]} 
                    placeholder="0" 
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={discount}
                    onChangeText={setDiscount}
                  />
                </View>
              </View>
            </View>

            {/* Total Product */}
            <InputLabel label="TOTAL PRODUCT" colors={colors} />
            <TextInput 
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} 
              placeholder="185" 
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />

            {/* Actions */}
            <View style={styles.footerActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.publishBtn, { backgroundColor: colors.primary }]} onPress={handlePublish} disabled={isPublishing}>
                <Text style={[styles.publishText, { color: colors.background }]}>{initialData ? 'Save Changes' : 'Publish'}</Text>
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sublabel: {
    fontSize: 11,
    marginTop: 4,
  },
  uploadBox: {
    width: '100%',
    height: 160,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadHint: {
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fileHint: {
    fontSize: 11,
    marginTop: 10,
  },
  dropdown: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 15,
  },
  input: {
    borderRadius: 12,
    padding: 16,
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
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  iconPrefix: {
    fontSize: 16,
    marginRight: 8,
  },
  flexInput: {
    flex: 1,
    paddingVertical: 16,
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
  },
  cancelText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  publishBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  publishText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
