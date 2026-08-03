export type FeedVideoSeekPlayer = {
  currentTime: number;
  playing?: boolean;
  play?: () => void;
};

export type FeedVideoSeekResult =
  | { ok: true; targetSeconds: number }
  | { ok: false; reason: "invalid_target" | "stale_media" | "player_error" };

const isFinitePositive = (value: number) => Number.isFinite(value) && value > 0;

export const clampFeedVideoSeekTarget = (targetSeconds: number, durationSeconds: number) => {
  if (!Number.isFinite(targetSeconds) || !isFinitePositive(durationSeconds)) {
    return null;
  }

  return Math.min(durationSeconds, Math.max(0, targetSeconds));
};

export const getFeedVideoSeekTargetFromLocation = (
  locationX: number,
  trackWidth: number,
  durationSeconds: number,
) => {
  if (!Number.isFinite(locationX) || !isFinitePositive(trackWidth) || !isFinitePositive(durationSeconds)) {
    return null;
  }

  const ratio = Math.min(1, Math.max(0, locationX / trackWidth));
  return ratio * durationSeconds;
};

export const commitFeedVideoSeek = ({
  player,
  targetSeconds,
  durationSeconds,
  expectedMediaId,
  currentMediaId,
  keepPlaying,
  onError,
}: {
  player: FeedVideoSeekPlayer;
  targetSeconds: number;
  durationSeconds: number;
  expectedMediaId: string;
  currentMediaId: string;
  keepPlaying?: boolean;
  onError?: (error: unknown) => void;
}): FeedVideoSeekResult => {
  if (expectedMediaId !== currentMediaId) {
    return { ok: false, reason: "stale_media" };
  }

  const clampedTarget = clampFeedVideoSeekTarget(targetSeconds, durationSeconds);

  if (clampedTarget == null) {
    return { ok: false, reason: "invalid_target" };
  }

  try {
    player.currentTime = clampedTarget;

    if (keepPlaying && !player.playing) {
      player.play?.();
    }

    return { ok: true, targetSeconds: clampedTarget };
  } catch (error) {
    onError?.(error);
    return { ok: false, reason: "player_error" };
  }
};
