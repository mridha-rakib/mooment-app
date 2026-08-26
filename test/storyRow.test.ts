import assert from "node:assert/strict";
import test from "node:test";

import { buildStoryRow, groupStoriesByAuthor, SELF_TILE_ID } from "../lib/storyRow";
import type { StoryData } from "../components/home/StoryCarousel";
import type { Story } from "../lib/stories";

const baseStory = (overrides: Partial<Story>): Story => ({
  id: "story-1",
  userId: "user-1",
  author: { id: "user-1", name: "Author" },
  mediaType: "image",
  mediaSource: "gallery",
  storageKey: "stories/story-1.jpg",
  mediaUrl: "https://cdn.example.com/story-1.jpg",
  contentType: "image/jpeg",
  durationSeconds: 5,
  caption: null,
  textContent: null,
  textBackground: null,
  textOverlay: null,
  audience: "connections",
  viewsCount: 0,
  reactionsCount: 0,
  commentsCount: 0,
  isReacted: false,
  isOwner: false,
  expiresInSeconds: 60,
  expiresAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

test("groupStoriesByAuthor marks the current user's group with isOwnStory", () => {
  const stories = [
    baseStory({ id: "s1", userId: "me", author: { id: "me", name: "Me" } }),
    baseStory({ id: "s2", userId: "friend", author: { id: "friend", name: "Friend" } }),
  ];

  const groups = groupStoriesByAuthor(stories, new Set(), "me");
  const own = groups.find((group) => group.authorId === "me");
  const other = groups.find((group) => group.authorId === "friend");

  assert.equal(own?.isOwnStory, true);
  assert.equal(other?.isOwnStory, false);
});

test("buildStoryRow: no own Story -> plain create-only self tile, first position", () => {
  const groups: StoryData[] = [
    { id: "story-group-friend", type: "standard", authorId: "friend", isOwnStory: false, storyItems: [] },
  ];

  const row = buildStoryRow(groups);

  assert.equal(row[0].id, SELF_TILE_ID);
  assert.equal(row[0].isSelfTile, true);
  assert.equal(row[0].hasOwnStory, false);
  assert.equal(row[0].type, "add");
  assert.equal(row.length, 2);
});

test("buildStoryRow: own Story exists -> merged into the first tile, not duplicated", () => {
  const groups: StoryData[] = [
    { id: "story-group-friend", type: "standard", authorId: "friend", isOwnStory: false, storyItems: [] },
    { id: "story-group-me", type: "standard", authorId: "me", isOwnStory: true, seen: false, storyItems: [{ id: "s1" } as never] },
  ];

  const row = buildStoryRow(groups);

  assert.equal(row.length, 2, "own group must be merged, not appended as a 3rd tile");
  assert.equal(row[0].id, SELF_TILE_ID);
  assert.equal(row[0].isSelfTile, true);
  assert.equal(row[0].hasOwnStory, true);
  assert.equal(row[0].authorId, "me");
  assert.deepEqual(row[0].storyItems, [{ id: "s1" }]);

  // No entry in the rest of the row still points at the current user.
  assert.equal(row.slice(1).some((entry) => entry.authorId === "me"), false);
});

test("buildStoryRow preserves the relative order of other authors' groups", () => {
  const groups: StoryData[] = [
    { id: "story-group-a", type: "standard", authorId: "a", isOwnStory: false, storyItems: [] },
    { id: "story-group-me", type: "standard", authorId: "me", isOwnStory: true, storyItems: [] },
    { id: "story-group-b", type: "standard", authorId: "b", isOwnStory: false, storyItems: [] },
  ];

  const row = buildStoryRow(groups);

  assert.deepEqual(
    row.map((entry) => entry.authorId),
    ["me", "a", "b"],
  );
});

test("buildStoryRow carries the own group's seen state onto the self tile", () => {
  const groups: StoryData[] = [
    { id: "story-group-me", type: "standard", authorId: "me", isOwnStory: true, seen: true, storyItems: [] },
  ];

  const row = buildStoryRow(groups);

  assert.equal(row[0].seen, true);
});

// Regression coverage for the Story viewer "correct on first render, snaps
// to full-screen cover a moment later" bug: view-story.tsx's mount-time
// background refetch (getDiscoverStories/getFriendStories) now regroups
// through this shared mapper instead of a private local copy that dropped
// imageTransform. Any future field added here must reach both the
// session-provided data (StoryCarousel -> this mapper) and the viewer's
// background refetch (also this mapper) automatically, since both paths
// share this single implementation.
test("groupStoriesByAuthor preserves a non-default imageTransform on each storyItem", () => {
  const transform = { x: 0.32, y: 0.71, scale: 1.8, rotation: 12 };
  const stories = [
    baseStory({
      id: "s1",
      userId: "me",
      author: { id: "me", name: "Me" },
      imageTransform: transform,
    }),
  ];

  const groups = groupStoriesByAuthor(stories);

  assert.deepEqual(groups[0]?.storyItems?.[0]?.imageTransform, transform);
  assert.deepEqual(groups[0]?.imageTransform, transform);
});

test("groupStoriesByAuthor preserves textOverlay alongside imageTransform", () => {
  const overlay = { text: "hi", x: 0.5, y: 0.5, scale: 1, color: "#fff" };
  const stories = [
    baseStory({
      id: "s1",
      userId: "me",
      author: { id: "me", name: "Me" },
      textOverlay: overlay,
      imageTransform: { x: 0.2, y: 0.2, scale: 1.2, rotation: 0 },
    }),
  ];

  const groups = groupStoriesByAuthor(stories);

  assert.deepEqual(groups[0]?.storyItems?.[0]?.textOverlay, overlay);
});

test("groupStoriesByAuthor leaves imageTransform undefined for a legacy Story that never set one", () => {
  const stories = [
    baseStory({ id: "s1", userId: "me", author: { id: "me", name: "Me" } }),
  ];

  const groups = groupStoriesByAuthor(stories);

  assert.equal(groups[0]?.storyItems?.[0]?.imageTransform, undefined);
});
