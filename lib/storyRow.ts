import type { Story } from "@/lib/stories";
import type { StoryData } from "@/components/home/StoryCarousel";

// Pure Story-row-building logic extracted out of app/(tabs)/home.tsx so it
// can be unit tested without pulling in React Native/expo-router.

export const SELF_TILE_ID = "add-story";

export const groupStoriesByAuthor = (
  feedStories: Story[],
  seenStoryIds = new Set<string>(),
  currentUserId?: string,
): StoryData[] => {
  const groupedStories = new Map<string, Story[]>();

  feedStories.forEach((story) => {
    const authorId = story.author?.id ?? story.userId;
    const authorStories = groupedStories.get(authorId) ?? [];

    authorStories.push(story);
    groupedStories.set(authorId, authorStories);
  });

  return Array.from(groupedStories.entries()).map(([authorId, authorStories]) => {
    const sortedStories = [...authorStories].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const latestStory = sortedStories[sortedStories.length - 1];
    const title = latestStory.author?.name ?? "Story";
    const storyItems = sortedStories.map((story) => ({
      id: story.id,
      mediaType: story.mediaType,
      mediaUri: story.mediaUrl,
      contentType: story.contentType,
      durationSeconds: story.durationSeconds || 15,
      caption: story.caption,
      textContent: story.textContent,
      textBackground: story.textBackground,
      textOverlay: story.textOverlay,
      imageTransform: story.imageTransform,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewsCount: story.viewsCount,
      reactionsCount: story.reactionsCount,
      commentsCount: story.commentsCount,
      isReacted: story.isReacted,
      isOwner: story.isOwner,
      authorId,
      authorName: title,
      authorAvatar: latestStory.author?.avatarUrl ?? null,
    }));

    return {
      id: `story-group-${authorId}`,
      type: "standard" as const,
      isOwnStory: currentUserId ? authorId === currentUserId : false,
      title,
      authorName: title,
      imageUri: latestStory.author?.avatarUrl ?? null,
      mediaUri: latestStory.mediaUrl,
      contentType: latestStory.contentType,
      mediaType: latestStory.mediaType,
      textContent: latestStory.textContent,
      textBackground: latestStory.textBackground,
      textOverlay: latestStory.textOverlay,
      imageTransform: latestStory.imageTransform,
      seen: storyItems.length > 0 && storyItems.every((story) => seenStoryIds.has(story.id)),
      storyItems,
      authorId,
      authorAvatar: latestStory.author?.avatarUrl ?? null,
    };
  });
};

// Merges the current user's own Story group (if any) into a single
// Instagram-like first-position self tile instead of letting it also
// appear a second time among the other authors' tiles. `groups` already
// carries at most one entry per author (see groupStoriesByAuthor), so at
// most one group can match `isOwnStory`.
export const buildStoryRow = (groups: StoryData[]): StoryData[] => {
  const ownGroupIndex = groups.findIndex((group) => group.isOwnStory);

  if (ownGroupIndex === -1) {
    return [{ id: SELF_TILE_ID, type: "add", isSelfTile: true, hasOwnStory: false }, ...groups];
  }

  const ownGroup = groups[ownGroupIndex];
  const otherGroups = groups.filter((_, index) => index !== ownGroupIndex);
  const selfTile: StoryData = { ...ownGroup, id: SELF_TILE_ID, isSelfTile: true, hasOwnStory: true };

  return [selfTile, ...otherGroups];
};
