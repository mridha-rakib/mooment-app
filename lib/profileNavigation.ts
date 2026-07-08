import type { Router } from "expo-router";

export type ProfileNavigationTarget = {
  userId?: string | null;
  name?: string | null;
  avatar?: string | null;
  isFollowing?: boolean;
};

const normalizeUserId = (userId?: string | null) => userId?.trim() || null;

export const isOwnProfileTarget = (
  currentUserId?: string | null,
  targetUserId?: string | null,
) => {
  const normalizedCurrentUserId = normalizeUserId(currentUserId);
  const normalizedTargetUserId = normalizeUserId(targetUserId);

  return Boolean(
    normalizedCurrentUserId
    && normalizedTargetUserId
    && normalizedCurrentUserId === normalizedTargetUserId,
  );
};

export const navigateToProfile = (
  router: Pick<Router, "push">,
  currentUserId: string | null | undefined,
  target: ProfileNavigationTarget,
) => {
  const userId = normalizeUserId(target.userId);

  if (!userId) {
    return false;
  }

  if (isOwnProfileTarget(currentUserId, userId)) {
    router.push("/(tabs)/profile");
    return true;
  }

  router.push({
    pathname: "/profile-screen/user-profile",
    params: {
      userId,
      ...(target.name?.trim() ? { name: target.name.trim() } : {}),
      ...(target.avatar?.trim() ? { avatar: target.avatar.trim() } : {}),
      ...(typeof target.isFollowing === "boolean"
        ? { isFollowing: String(target.isFollowing) }
        : {}),
    },
  });

  return true;
};
