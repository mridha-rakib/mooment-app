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
};

export type ProfileFollowUserResponse = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  isFollowing: boolean;
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
  };
};

export const getUserFollowers = async (
  userId: string,
  search?: string,
  limit = 100,
): Promise<ProfileFollowUserResponse[]> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}/followers`, {
    params: {
      search,
      limit,
    },
  });
  const users = response.data?.data?.users;

  return Array.isArray(users) ? (users as ProfileFollowUserResponse[]) : [];
};

export const getUserFollowing = async (
  userId: string,
  search?: string,
  limit = 100,
): Promise<ProfileFollowUserResponse[]> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}/following`, {
    params: {
      search,
      limit,
    },
  });
  const users = response.data?.data?.users;

  return Array.isArray(users) ? (users as ProfileFollowUserResponse[]) : [];
};

export const getUserReviews = async (userId: string): Promise<UserReviewResponse[]> => {
  const response = await api.get(`/users/${encodeURIComponent(userId)}/reviews`);
  const reviews = response.data?.data?.reviews;

  return Array.isArray(reviews) ? (reviews as UserReviewResponse[]) : [];
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
