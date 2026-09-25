import { createVideoPlayer, type VideoSource, type VideoThumbnail } from 'expo-video';

export type StoryThumbnailSource = VideoThumbnail | { uri: string } | null;

const thumbnailCache = new Map<string, StoryThumbnailSource>();

const wait = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms);
});

const waitForPlayerReady = async (player: ReturnType<typeof createVideoPlayer>, timeoutMs = 10000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (player.status === 'readyToPlay') {
      return;
    }

    if (player.status === 'error') {
      throw new Error('Unable to load the video for thumbnail generation.');
    }

    await wait(50);
  }

  throw new Error('Timed out while generating the story thumbnail.');
};

export const getCachedStoryThumbnail = (storyId: string): StoryThumbnailSource =>
  thumbnailCache.get(storyId) ?? null;

export const setCachedStoryThumbnail = (storyId: string, thumbnail: StoryThumbnailSource) => {
  thumbnailCache.set(storyId, thumbnail);
};

export const generateStoryThumbnail = async (
  uri: string,
  headers?: Record<string, string>,
): Promise<VideoThumbnail | null> => {
  const source: VideoSource = headers ? { uri, headers, useCaching: true } : { uri, useCaching: true };
  const player = createVideoPlayer(source);

  try {
    await waitForPlayerReady(player);

    const thumbnails = await player.generateThumbnailsAsync(0.5);

    return thumbnails[0] ?? null;
  } catch {
    return null;
  } finally {
    (player as { release?: () => void }).release?.();
  }
};
