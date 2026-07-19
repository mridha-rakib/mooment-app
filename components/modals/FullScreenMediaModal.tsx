import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type FullScreenMediaItem = {
  id?: string;
  uri: string;
  type: 'image' | 'video';
  headers?: Record<string, string>;
};

interface FullScreenMediaModalProps {
  visible: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  onDeleteCurrent?: (item: FullScreenMediaItem, index: number) => void;
  canDeleteCurrent?: (item: FullScreenMediaItem, index: number) => boolean;
  deletingItemId?: string | null;
  mediaItems: FullScreenMediaItem[];
  initialIndex: number;
}

const clampIndex = (index: number, itemCount: number) => (
  Math.min(Math.max(Math.round(index) || 0, 0), Math.max(itemCount - 1, 0))
);

function FullScreenImage({ uri, headers }: { uri: string; headers?: Record<string, string> }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [uri]);

  return (
    <View style={styles.fullMedia}>
      {!hasError ? (
        <Image
          source={{ uri, headers }}
          style={styles.fullMedia}
          resizeMode="contain"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      ) : (
        <View style={styles.errorState}>
          <Feather name="image" size={34} color="#8E8E9B" />
          <Text style={styles.errorText}>Unable to load this image</Text>
        </View>
      )}

      {isLoading && !hasError ? (
        <ActivityIndicator style={styles.loadingIndicator} size="large" color="#FFFFFF" />
      ) : null}
    </View>
  );
}

function FullScreenVideo({ uri, headers, isActive }: { uri: string; headers?: Record<string, string>; isActive: boolean }) {
  const source = useMemo(() => (headers ? { uri, headers } : uri), [headers, uri]);
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  useEffect(() => {
    if (!isActive) {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      style={styles.fullMedia}
      nativeControls
      contentFit="contain"
    />
  );
}

export default function FullScreenMediaModal({
  visible,
  onClose,
  onIndexChange,
  onDeleteCurrent,
  canDeleteCurrent,
  deletingItemId,
  mediaItems,
  initialIndex,
}: FullScreenMediaModalProps) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<FullScreenMediaItem>>(null);
  const normalizedMediaItems = useMemo(
    () => mediaItems.filter((item) => Boolean(item.uri?.trim())),
    [mediaItems],
  );
  const requestedIndex = clampIndex(initialIndex, normalizedMediaItems.length);
  const [currentIndex, setCurrentIndex] = useState(requestedIndex);
  const currentItem = normalizedMediaItems[currentIndex] ?? null;
  const showDelete = Boolean(currentItem && canDeleteCurrent?.(currentItem, currentIndex));
  const isDeletingCurrent = Boolean(currentItem?.id && deletingItemId === currentItem.id);

  const scrollToRequestedItem = useCallback(() => {
    if (!visible || normalizedMediaItems.length === 0 || width <= 0) {
      return;
    }

    listRef.current?.scrollToOffset({
      offset: requestedIndex * width,
      animated: false,
    });
  }, [normalizedMediaItems.length, requestedIndex, visible, width]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setCurrentIndex(requestedIndex);
    const frame = requestAnimationFrame(scrollToRequestedItem);

    return () => cancelAnimationFrame(frame);
  }, [requestedIndex, scrollToRequestedItem, visible]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) {
      return;
    }

    const nextIndex = clampIndex(
      event.nativeEvent.contentOffset.x / width,
      normalizedMediaItems.length,
    );
    setCurrentIndex(nextIndex);
    onIndexChange?.(nextIndex);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      hardwareAccelerated
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container} onLayout={scrollToRequestedItem}>
        <FlatList
          ref={listRef}
          data={normalizedMediaItems}
          keyExtractor={(item, index) => `${item.type}-${item.uri}-${index}`}
          renderItem={({ item, index }) => (
            <View style={[styles.slide, { width, height }]}>
              {item.type === 'video' ? (
                <FullScreenVideo uri={item.uri} headers={item.headers} isActive={visible && index === currentIndex} />
              ) : (
                <FullScreenImage uri={item.uri} headers={item.headers} />
              )}
            </View>
          )}
          horizontal
          pagingEnabled
          bounces={false}
          initialScrollIndex={normalizedMediaItems.length > 0 ? requestedIndex : undefined}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollToIndexFailed={({ index }) => {
            listRef.current?.scrollToOffset({ offset: index * width, animated: false });
          }}
          showsHorizontalScrollIndicator={false}
          style={styles.mediaContainer}
        />

        <SafeAreaView pointerEvents="box-none" style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close full-screen media"
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {showDelete && currentItem ? (
            <TouchableOpacity
              style={[styles.closeBtn, styles.deleteBtn]}
              onPress={() => onDeleteCurrent?.(currentItem, currentIndex)}
              activeOpacity={0.7}
              disabled={isDeletingCurrent}
              accessibilityRole="button"
              accessibilityLabel="Delete media"
              accessibilityState={{ disabled: isDeletingCurrent }}
            >
              {isDeletingCurrent ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Feather name="trash-2" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ) : null}
        </SafeAreaView>

        {normalizedMediaItems.length > 1 ? (
          <SafeAreaView pointerEvents="none" style={styles.footer}>
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>{currentIndex + 1} / {normalizedMediaItems.length}</Text>
            </View>
          </SafeAreaView>
        ) : null}
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
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(32, 32, 32, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(181, 38, 38, 0.82)',
  },
  mediaContainer: {
    flex: 1,
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  fullMedia: {
    width: '100%',
    height: '100%',
  },
  loadingIndicator: {
    ...StyleSheet.absoluteFillObject,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#D0D0D8',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterPill: {
    minWidth: 54,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(32, 32, 32, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
