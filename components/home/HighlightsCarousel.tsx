import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';

export type HighlightData = {
  id: string;
  title: string;
  imageUri: string;
  ringColor: string;
};

type HighlightsProps = {
  highlights: HighlightData[];
};

export default function HighlightsCarousel({ highlights }: HighlightsProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {highlights.map((item) => (
          <TouchableOpacity key={item.id} activeOpacity={0.8} style={styles.highlightWrapper}>
            <View style={[styles.ring, { borderColor: item.ringColor }]}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.imageUri }} style={styles.image} />
                <View style={styles.overlay} />
                <Text style={styles.titleText}>{item.title}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  highlightWrapper: {
    marginRight: 12,
  },
  ring: {
    width: 96,
    height: 130, // Taller pill/oval shape
    borderRadius: 48,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3, 
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    overflow: 'hidden',
    backgroundColor: '#13131A',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.35)', 
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 8,
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
