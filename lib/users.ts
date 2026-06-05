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

export const followUser = async (userId: string): Promise<FollowStatusResponse> => {
  const response = await api.post(`/users/${encodeURIComponent(userId)}/follow`);

  return parseFollowStatus(response.data?.data?.follow, userId);
};

export const unfollowUser = async (userId: string): Promise<FollowStatusResponse> => {
  const response = await api.delete(`/users/${encodeURIComponent(userId)}/follow`);

  return parseFollowStatus(response.data?.data?.follow, userId);
};
