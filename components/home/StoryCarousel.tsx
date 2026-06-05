import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type StoryData = {
  id: string;
  type: 'add' | 'live' | 'standard' | 'muted';
  imageUri?: string;
  mediaUri?: string | null;
  storyItems?: StorySequenceItem[];
  title?: string;
  authorName?: string;
  seen?: boolean;
};

export type StorySequenceItem = {
  id: string;
  mediaUri: string;
  durationSeconds: number;
  caption?: string | null;
  createdAt?: string;
};

const getCompactStoryName = (fullName?: string) => {
  const nameParts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (nameParts.length === 0) {
    return '';
  }

  if (nameParts.length === 1) {
    return nameParts[0];
  }

  return `${nameParts[0]} ${nameParts[1].charAt(0).toUpperCase()}.`;
};

export default function StoryCarousel({ stories }: { stories: StoryData[] }) {
  const router = useRouter();

  return (
    <View style={styles.storiesContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
        {stories.map((story) => {
          if (story.type === 'add') {
            return (
              <TouchableOpacity
                key={story.id}
                style={styles.addStoryBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/post-screen/add-story')}
              >
                <Feather name="plus" size={24} color="#bcbccaff" />
              </TouchableOpacity>
            );
          }

          const ringStyle =
            story.seen ? styles.storyRingSeen :
              story.type === 'live' ? styles.storyRingLive :
                story.type === 'standard' ? styles.storyRingStandard :
                  styles.storyRingMuted;
          const compactStoryName = getCompactStoryName(story.title ?? story.authorName);

          return (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              activeOpacity={0.8}
              onPress={() => {
                if (story.storyItems?.length || story.mediaUri) {
                  const storyItems = story.storyItems ?? (
                    story.mediaUri
                      ? [{ id: story.id, mediaUri: story.mediaUri, durationSeconds: 15 }]
                      : []
                  );

                  router.push({
                    pathname: '/post-screen/view-story',
                    params: {
                      stories: JSON.stringify(storyItems),
                      title: story.title ?? story.authorName ?? 'Story',
                    },
                  });
                  return;
                }

                router.push('/live-screen/live-video');
              }}
            >
              <View style={[styles.storyRing, ringStyle]}>
                {story.imageUri && (
                  <Image source={{ uri: story.imageUri }} style={styles.storyImage} />
                )}

                {story.type === 'live' && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                )}

                {story.type === 'standard' && compactStoryName && (
                  <View style={styles.storyOverlayTextContainer}>
                    <Text style={styles.storyOverlayText} numberOfLines={2}>{compactStoryName}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  storiesContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  storiesScroll: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  addStoryBtn: {
    width: 68,
    height: 86,
    borderRadius: 34,
    backgroundColor: "#2B2B36",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  storyItem: {
    marginRight: 16,
  },
  storyRing: {
    width: 74,
    height: 92,
    borderRadius: 37,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  storyRingLive: {
    backgroundColor: "#F2245C",
  },
  storyRingStandard: {
    backgroundColor: "#42B0D5",
  },
  storyRingMuted: {
    backgroundColor: "transparent",
  },
  storyRingSeen: {
    backgroundColor: "#4A4A55",
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#0e0d12",
  },
  liveBadge: {
    position: "absolute",
    top: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#16D869",
    marginRight: 4,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  storyOverlayTextContainer: {
    position: "absolute",
    top: 10,
    width: "100%",
    alignItems: "center",
  },
  storyOverlayText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
