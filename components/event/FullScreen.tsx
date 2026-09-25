import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const COLORS = {
  text: "#FFFFFF",
};

interface FullScreenProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

const FullScreen = ({ visible, imageUri, onClose }: FullScreenProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="chevron-left" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn}>
            <Feather name="share" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.imageWrapper}>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="contain"
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default FullScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width,
    height: "100%",
  },
});
