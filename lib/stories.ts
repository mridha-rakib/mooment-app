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
  viewsCount: number;
  reactionsCount: number;
  commentsCount: number;
  isReacted: boolean;
  isOwner: boolean;
  expiresInSeconds: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StoryInteraction = {
  viewsCount: number;
  reactionsCount: number;
  commentsCount: number;
  isReacted: boolean;
};

export type StoryComment = {
  id: string;
  storyId: string;
  parentCommentId?: string | null;
  author?: StoryAuthor | null;
  text: string;
  likesCount: number;
  isLiked: boolean;
  replies: StoryComment[];
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

const getStoryList = async (path: string) => {
  const response = await api.get(path);
  return normalizeStories((response.data?.data?.stories ?? []) as Story[]);
};

export const getDiscoverStories = () => getStoryList("/stories/discover");
export const getFriendStories = () => getStoryList("/stories/friends");
export const getUserStories = (userId: string) => getStoryList(`/stories/user/${encodeURIComponent(userId)}`);

const isStoryInteraction = (value: unknown): value is StoryInteraction => {
  const interaction = value as Partial<StoryInteraction> | undefined;

  return Boolean(
    interaction
    && typeof interaction.viewsCount === "number"
    && typeof interaction.reactionsCount === "number"
    && typeof interaction.commentsCount === "number"
    && typeof interaction.isReacted === "boolean",
  );
};

export const recordStoryView = async (storyId: string): Promise<StoryInteraction> => {
  const response = await api.post(`/stories/${encodeURIComponent(storyId)}/view`);
  const interaction = response.data?.data?.interaction;

  if (!isStoryInteraction(interaction)) {
    throw new Error("The story view response was incomplete.");
  }

  return interaction;
};

export const toggleStoryReaction = async (storyId: string): Promise<StoryInteraction> => {
  const response = await api.post(`/stories/${encodeURIComponent(storyId)}/reaction`);
  const interaction = response.data?.data?.interaction;

  if (!isStoryInteraction(interaction)) {
    throw new Error("The story reaction response was incomplete.");
  }

  return interaction;
};

export const deleteStory = async (storyId: string): Promise<void> => {
  await api.delete(`/stories/${encodeURIComponent(storyId)}`);
};

export const getStoryDetails = async (storyId: string): Promise<Story> => {
  const response = await api.get(`/stories/${encodeURIComponent(storyId)}`);
  const rawStory = response.data?.data?.story as Story | undefined;

  if (!rawStory) {
    throw new Error("Story not found");
  }

  const normalized = normalizeStories([rawStory]);
  return normalized[0];
};

export const getStoryComments = async (storyId: string): Promise<StoryComment[]> => {
  const response = await api.get(`/stories/${encodeURIComponent(storyId)}/comments`);
  const comments = response.data?.data?.comments;
  return Array.isArray(comments) ? comments as StoryComment[] : [];
};

export const createStoryComment = async (storyId: string, payload: { text: string; parentCommentId?: string | null }) => {
  const response = await api.post(`/stories/${encodeURIComponent(storyId)}/comments`, payload);
  const data = response.data?.data as { comment?: StoryComment; interaction?: unknown } | undefined;

  if (!data?.comment || !isStoryInteraction(data.interaction)) {
    throw new Error("The story comment response was incomplete.");
  }

  return data as { comment: StoryComment; interaction: StoryInteraction };
};

export const shareStoryToFeed = async (
  storyId: string,
  payload: { caption?: string | null; taggedFriendIds?: string[]; clientRequestId?: string | null },
) => {
  const response = await api.post(`/stories/${encodeURIComponent(storyId)}/share`, payload);
  const share = response.data?.data?.share as { momentId?: string } | undefined;

  if (!share?.momentId) {
    throw new Error("The story share response was incomplete.");
  }

  return share as { momentId: string };
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
