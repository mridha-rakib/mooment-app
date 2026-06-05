import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORY_SEEN_KEY = "xenog.seenStories.v1";
const STORY_SEEN_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_STORED_STORIES = 500;

type SeenStoryStore = Record<string, number>;

let memoryStore: string | null = null;

const canUseSecureStore = async () => Platform.OS !== "web" && (await SecureStore.isAvailableAsync());

const readStoredValue = async () => {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(STORY_SEEN_KEY) ?? memoryStore;
  }

  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(STORY_SEEN_KEY);
  }

  return memoryStore;
};

const writeStoredValue = async (value: string) => {
  memoryStore = value;

  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(STORY_SEEN_KEY, value);
    return;
  }

  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(STORY_SEEN_KEY, value);
  }
};

const getPrunedStore = (store: SeenStoryStore): SeenStoryStore => {
  const cutoff = Date.now() - STORY_SEEN_TTL_MS;
  const entries = Object.entries(store)
    .filter(([, seenAt]) => seenAt >= cutoff)
    .sort(([, firstSeenAt], [, secondSeenAt]) => secondSeenAt - firstSeenAt)
    .slice(0, MAX_STORED_STORIES);

  return Object.fromEntries(entries);
};

const readSeenStore = async (): Promise<SeenStoryStore> => {
  const storedValue = await readStoredValue();

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(storedValue) as SeenStoryStore;

    return getPrunedStore(parsedValue);
  } catch {
    return {};
  }
};

export const getSeenStoryIds = async (): Promise<Set<string>> => {
  const store = await readSeenStore();

  return new Set(Object.keys(store));
};

export const markStoriesSeen = async (storyIds: string[]) => {
  const uniqueStoryIds = [...new Set(storyIds.filter(Boolean))];

  if (uniqueStoryIds.length === 0) {
    return;
  }

  const now = Date.now();
  const store = await readSeenStore();

  uniqueStoryIds.forEach((storyId) => {
    store[storyId] = now;
  });

  await writeStoredValue(JSON.stringify(getPrunedStore(store)));
};
