import { api } from "@/lib/api";
import { getStorageFileUrl } from "@/lib/storage";

export type StoryMediaSource = "camera" | "gallery" | "upload";
export type StoryMediaType = "image" | "video" | "text";

export type StoryTextBackground = {
  type: "color" | "gradient";
  colors: string[];
};

export type StoryTextOverlay = {
  text: string;
  x: number;
  y: number;
  scale: number;
  color: string;
  fontWeight?: "normal" | "600" | "700" | "bold";
  textAlign?: "left" | "center" | "right";
};

export type StoryAuthor = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
};

export type Story = {
  id: string;
  userId: string;
  author?: StoryAuthor | null;
  mediaType: StoryMediaType;
  mediaSource: StoryMediaSource;
  storageKey?: string | null;
  mediaUrl?: string | null;
  contentType?: string | null;
  durationSeconds: number;
  caption?: string | null;
  textContent?: string | null;
  textBackground?: StoryTextBackground | null;
  textOverlay?: StoryTextOverlay | null;
  audience: "connections";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoryPayload = {
  mediaType?: StoryMediaType;
  mediaSource?: StoryMediaSource;
  storageKey?: string | null;
  contentType?: string | null;
  durationSeconds: number;
  caption?: string | null;
  textContent?: string | null;
  textBackground?: StoryTextBackground | null;
  textOverlay?: StoryTextOverlay | null;
};

export const createStory = async (payload: CreateStoryPayload): Promise<Story> => {
  const response = await api.post("/stories", payload);
  const story = response.data?.data?.story as Story | undefined;

  if (!story) {
    throw new Error("The story response was incomplete.");
  }

  return story;
};

export const getFeedStories = async (): Promise<Story[]> => {
  const startedAt = Date.now();
  const response = await api.get("/stories");
  const responseAt = Date.now();
  const rawStories = (response.data?.data?.stories ?? []) as Story[];
  const normalized = normalizeStories(rawStories);

  if (__DEV__) {
    console.log("[StoryPlaybackTiming] story-api", {
      responseMs: responseAt - startedAt,
      normalizationMs: Date.now() - responseAt,
      storyCount: normalized.length,
      totalMs: Date.now() - startedAt,
    });
  }

  return normalized;
};

export const getMyStories = async (): Promise<Story[]> => {
  const response = await api.get("/stories/mine");

  return normalizeStories((response.data?.data?.stories ?? []) as Story[]);
};

const getNonEmptyString = (value?: string | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

const normalizeStories = (stories: Story[]) => {
  const startedAt = Date.now();
  const normalized = stories.map((story) => {
    const directMediaUrl = getNonEmptyString(story.mediaUrl);
    const directAvatarUrl = getNonEmptyString(story.author?.avatarUrl);

    return {
      ...story,
      mediaUrl: directMediaUrl ?? (story.storageKey ? getStorageFileUrl(story.storageKey, story.contentType) : null),
      author: story.author
        ? {
            ...story.author,
            avatarUrl: directAvatarUrl ?? (story.author.avatarKey ? getStorageFileUrl(story.author.avatarKey) : null),
          }
        : story.author,
    };
  });

  if (__DEV__) {
    console.log("[StoryPlaybackTiming] media-url-generation", {
      storyCount: stories.length,
      durationMs: Date.now() - startedAt,
    });
  }

  return normalized;
};
