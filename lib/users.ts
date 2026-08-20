import { api } from "@/lib/api";

export type SuggestedUserResponse = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  isFollowing: boolean;
};

export type FriendUserResponse = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
};

export type FollowStatusResponse = {
  userId: string;
  isFollowing: boolean;
};

export type ProfileStatsResponse = {
  reviews: number;
  followers: number;
  following: number;
  windows: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProfileFollowUserResponse = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  isFollowing: boolean;
};

export type BlockedUserResponse = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  blockedAt: string;
};

export type UserReviewResponse = {
  id: string;
  author: {
    id: string;
    name: string;
    username?: string;
    avatarKey?: string | null;
    avatarUrl?: string | null;
  } | null;
  text: string;
  liked: boolean;
  event?: {
    id: string;
    name?: string | null;
  } | null;
  createdAt: string;
};

export type UserResponse = {
  _id?: string;
  id?: string;
  name: string;
  username?: string;
  email?: string;
  accountType?: "personal" | "business";
  avatarKey?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isFollowing?: boolean;
  profileAccess?: "open" | "blocked";
  viewerHasBlockedTarget?: boolean;
  targetHasBlockedViewer?: boolean;
  blockedTitle?: string;
  blockedDescription?: string;
};

export type ProfileWindowEventResponse = {
  id: string;
  name: string;
  bannerImageKey?: string | null;
  bannerImageDisplay?: unknown;
  scheduledAt?: string | null;
  endAt?: string | null;
  status: string;
  windowCount: number;
  lastParticipatedAt: string;
};

export type ProfileWindowPostResponse = {
  id: string;
  eventId: string;
  windowId: string;
  userId: string;
  author?: {
    id: string;
    name: string;
    username?: string;
    avatarKey?: string | null;
    avatarUrl?: string | null;
  } | null;
  contentType: "text" | "image" | "video" | "audio";
  text?: string | null;
  mediaItems: {
    type: "image" | "video" | "audio";
    source: "gallery" | "camera" | "upload" | "external";
    url?: string | null;
    contentType?: string | null;
    durationSeconds?: number | null;
  }[];
  status: "accepted" | "removed";
  window: {
    id: string;
    title?: string | null;
    startsAt: string;
    endsAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

const parseFollowStatus = (payload: unknown, fallbackUserId: string): FollowStatusResponse => {
  const follow = payload as Partial<FollowStatusResponse> | undefined;

  if (typeof follow?.isFollowing !== "boolean") {
    throw new Error("The follow response was incomplete.");
  }

  return {
    userId: typeof follow.userId === "string" ? follow.userId : fallbackUserId,
    isFollowing: follow.isFollowing,
  };
};

export const getSuggestedUsers = async (limit = 10): Promise<SuggestedUserResponse[]> => {
  const response = await api.get("/users/suggestions", {
    params: {
      limit,
    },
  });

  const users = response.data?.data?.users;

  return Array.isArray(users) ? (users as SuggestedUserResponse[]) : [];
};

export const getFriendUsers = async (search?: string, limit = 100): Promise<FriendUserResponse[]> => {
  const response = await api.get("/users/friends", {
    params: {
      search,
      limit,
    },
  });
  const friends = response.data?.data?.friends;

  return Array.isArray(friends) ? (friends as FriendUserResponse[]) : [];
};

export const getUserById = async (userId: string): Promise<UserResponse> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}`);
  const user = (response.data?.data?.user ?? response.data?.data) as UserResponse | undefined;

  if (!user) {
    throw new Error("The user response was incomplete.");
  }

  return user;
};

export const getUserProfileStats = async (userId: string): Promise<ProfileStatsResponse> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}/profile-stats`);
  const stats = response.data?.data?.stats as Partial<ProfileStatsResponse> | undefined;

  return {
    reviews: typeof stats?.reviews === "number" ? stats.reviews : 0,
    followers: typeof stats?.followers === "number" ? stats.followers : 0,
    following: typeof stats?.following === "number" ? stats.following : 0,
    windows: typeof stats?.windows === "number" ? stats.windows : 0,
  };
};

const resolveApiUrl = (url?: string | null) => {
  if (!url || /^https?:\/\//i.test(url)) {
    return url ?? null;
  }

  const baseURL = api.defaults.baseURL?.replace(/\/$/, "");
  return baseURL ? `${baseURL}${url.startsWith("/") ? url : `/${url}`}` : url;
};

const normalizeProfileWindowPostMediaUrls = (post: ProfileWindowPostResponse): ProfileWindowPostResponse => ({
  ...post,
  mediaItems: post.mediaItems.map((mediaItem) => ({
    ...mediaItem,
    url: resolveApiUrl(mediaItem.url),
  })),
});

export const getUserProfileWindowEvents = async (
  userId: string,
  options: { page?: number; limit?: number } = {},
): Promise<{ events: ProfileWindowEventResponse[]; pagination?: PaginationMeta }> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}/profile-windows`, { params: options });
  const events = response.data?.data?.events;

  return {
    events: Array.isArray(events) ? (events as ProfileWindowEventResponse[]) : [],
    pagination: response.data?.meta?.pagination as PaginationMeta | undefined,
  };
};

export const getUserProfileWindowPosts = async (
  userId: string,
  eventId: string,
  options: { page?: number; limit?: number } = {},
): Promise<{ posts: ProfileWindowPostResponse[]; pagination?: PaginationMeta }> => {
  const response = await api.get(
    `/users/${encodeURIComponent(userId)}/profile-windows/${encodeURIComponent(eventId)}/posts`,
    { params: options },
  );
  const posts = response.data?.data?.posts;

  return {
    posts: Array.isArray(posts) ? (posts as ProfileWindowPostResponse[]).map(normalizeProfileWindowPostMediaUrls) : [],
    pagination: response.data?.meta?.pagination as PaginationMeta | undefined,
  };
};

export const getUserFollowers = async (
  userId: string,
  search?: string,
  limit = 100,
  page?: number,
): Promise<{ users: ProfileFollowUserResponse[]; pagination?: PaginationMeta }> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}/followers`, {
    params: {
      search,
      limit,
      page,
    },
  });
  const users = response.data?.data?.users;

  return {
    users: Array.isArray(users) ? (users as ProfileFollowUserResponse[]) : [],
    pagination: response.data?.meta?.pagination as PaginationMeta | undefined,
  };
};

export const getUserFollowing = async (
  userId: string,
  search?: string,
  limit = 100,
  page?: number,
): Promise<{ users: ProfileFollowUserResponse[]; pagination?: PaginationMeta }> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}/following`, {
    params: {
      search,
      limit,
      page,
    },
  });
  const users = response.data?.data?.users;

  return {
    users: Array.isArray(users) ? (users as ProfileFollowUserResponse[]) : [],
    pagination: response.data?.meta?.pagination as PaginationMeta | undefined,
  };
};

export const getBlockedUsers = async (
  page = 1,
  limit = 30,
): Promise<{ users: BlockedUserResponse[]; pagination?: PaginationMeta }> => {
  const response = await api.get("/users/me/blocked-users", {
    params: {
      page,
      limit,
    },
  });
  const users = response.data?.data?.users;

  return {
    users: Array.isArray(users) ? (users as BlockedUserResponse[]) : [],
    pagination: response.data?.meta?.pagination as PaginationMeta | undefined,
  };
};

export const getUserReviews = async (
  userId: string,
  options: { page?: number; limit?: number } = {},
): Promise<{ reviews: UserReviewResponse[]; pagination?: PaginationMeta }> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}/reviews`, { params: options });
  const reviews = response.data?.data?.reviews;

  return {
    reviews: Array.isArray(reviews) ? (reviews as UserReviewResponse[]) : [],
    pagination: response.data?.meta?.pagination as PaginationMeta | undefined,
  };
};

export type BlockStatusResponse = {
  userId: string;
  isBlocked: boolean;
};

const parseBlockStatus = (payload: unknown, fallbackUserId: string): BlockStatusResponse => {
  const block = payload as Partial<BlockStatusResponse> | undefined;

  if (typeof block?.isBlocked !== "boolean") {
    throw new Error("The block response was incomplete.");
  }

  return {
    userId: typeof block.userId === "string" ? block.userId : fallbackUserId,
    isBlocked: block.isBlocked,
  };
};

export const blockUser = async (userId: string): Promise<BlockStatusResponse> => {
  const response = await api.post(`/users/${encodeURIComponent(userId)}/block`);
  return parseBlockStatus(response.data?.data?.block, userId);
};

export const unblockUser = async (userId: string): Promise<BlockStatusResponse> => {
  const response = await api.delete(`/users/${encodeURIComponent(userId)}/block`);
  return parseBlockStatus(response.data?.data?.block, userId);
};

export const followUser = async (userId: string): Promise<FollowStatusResponse> => {
  const response = await api.post(`/users/${encodeURIComponent(userId)}/follow`);

  return parseFollowStatus(response.data?.data?.follow, userId);
};

export const unfollowUser = async (userId: string): Promise<FollowStatusResponse> => {
  const response = await api.delete(`/users/${encodeURIComponent(userId)}/follow`);

  return parseFollowStatus(response.data?.data?.follow, userId);
};
