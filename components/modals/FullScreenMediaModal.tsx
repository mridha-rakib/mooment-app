import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

const { width, height } = Dimensions.get('window');

interface FullScreenMediaModalProps {
  visible: boolean;
  onClose: () => void;
  mediaUris: string[];
  initialIndex: number;
}

export default function FullScreenMediaModal({
  visible,
  onClose,
  mediaUris,
  initialIndex,
}: FullScreenMediaModalProps) {
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        <SafeAreaView style={styles.header}>
          <TouchableOpacity 
            style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          contentOffset={{ x: initialIndex * width, y: 0 }}
          style={styles.mediaContainer}
        >
          {mediaUris.map((uri, index) => (
            <View key={index} style={styles.slide}>
              <Image 
                source={{ uri }} 
                style={styles.fullImage} 
                resizeMode="contain" 
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
           {mediaUris.length > 1 && (
             <View style={styles.indicatorContainer}>
                {mediaUris.map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.indicator, 
                      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)' },
                      i === currentIndex && [styles.activeIndicator, { backgroundColor: colors.primary }]
                    ]} 
                  />
                ))}
             </View>
           )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    flex: 1,
  },
  slide: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeIndicator: {
    width: 12,
  },
});
