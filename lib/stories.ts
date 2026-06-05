import { api } from "@/lib/api";
import { getStorageFileUrl } from "@/lib/storage";

export type StoryMediaSource = "camera" | "gallery" | "upload";

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
  mediaType: "video";
  mediaSource: StoryMediaSource;
  storageKey: string;
  mediaUrl?: string | null;
  contentType: string;
  durationSeconds: number;
  caption?: string | null;
  audience: "connections";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoryPayload = {
  mediaSource?: StoryMediaSource;
  storageKey: string;
  contentType: string;
  durationSeconds: number;
  caption?: string | null;
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
  const response = await api.get("/stories");

  return normalizeStories((response.data?.data?.stories ?? []) as Story[]);
};

export const getMyStories = async (): Promise<Story[]> => {
  const response = await api.get("/stories/mine");

  return normalizeStories((response.data?.data?.stories ?? []) as Story[]);
};

const normalizeStories = (stories: Story[]) =>
  stories.map((story) => ({
    ...story,
    mediaUrl: getStorageFileUrl(story.storageKey),
    author: story.author
      ? {
          ...story.author,
          avatarUrl: story.author.avatarKey ? getStorageFileUrl(story.author.avatarKey) : story.author.avatarUrl,
        }
      : story.author,
  }));
