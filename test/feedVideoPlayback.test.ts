import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

type FeedVideoPlaybackModule = typeof import("../lib/feedVideoPlayback");

const playbackModulePath = "../lib/feedVideoPlayback" + ".ts";
const {
  classifyFeedVideoPlaybackError,
  isStaleFeedVideoGeneration,
  shouldRunFeedVideoTimeUpdates,
  shouldShowFeedVideoRetry,
} = await import(playbackModulePath) as FeedVideoPlaybackModule;

const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const videoFeedMediaSource = feedPostSource.slice(
  feedPostSource.indexOf("const VideoFeedMedia"),
  feedPostSource.indexOf("function CroppedFeedImage"),
);
const retrySource = videoFeedMediaSource.slice(
  videoFeedMediaSource.indexOf("const handleManualRetry"),
  videoFeedMediaSource.indexOf("useEffect(() => {"),
);

test("Feed video classifies safe internal playback error categories", () => {
  assert.equal(classifyFeedVideoPlaybackError("HTTP response code 403").kind, "http");
  assert.equal(classifyFeedVideoPlaybackError("SocketTimeoutException").kind, "timeout");
  assert.equal(classifyFeedVideoPlaybackError("Network connection reset").kind, "network");
  assert.equal(classifyFeedVideoPlaybackError("DecoderInitializationException unsupported format").kind, "decoder");
  assert.equal(classifyFeedVideoPlaybackError("Unexpected end of stream from source").kind, "source_unavailable");
  assert.equal(classifyFeedVideoPlaybackError("Player has been released").kind, "player_released");
  assert.equal(classifyFeedVideoPlaybackError("").kind, "unknown");
});

test("Retry UI requires both terminal status and a scoped failure", () => {
  assert.equal(shouldShowFeedVideoRetry("loading", classifyFeedVideoPlaybackError("HTTP 404")), false);
  assert.equal(shouldShowFeedVideoRetry("readyToPlay", classifyFeedVideoPlaybackError("HTTP 404")), false);
  assert.equal(shouldShowFeedVideoRetry("error", null), false);
  assert.equal(shouldShowFeedVideoRetry("error", classifyFeedVideoPlaybackError("HTTP 404")), true);
});

test("active-only time updates preserve pause and background semantics", () => {
  assert.equal(shouldRunFeedVideoTimeUpdates(true, true, "active"), true);
  assert.equal(shouldRunFeedVideoTimeUpdates(false, true, "active"), false);
  assert.equal(shouldRunFeedVideoTimeUpdates(true, false, "active"), false);
  assert.equal(shouldRunFeedVideoTimeUpdates(true, true, "background"), false);
});

test("generation guard rejects stale recycled media events", () => {
  assert.equal(isStaleFeedVideoGeneration(2, 2), false);
  assert.equal(isStaleFeedVideoGeneration(1, 2), true);
});

test("Feed video uses expo-video events instead of inactive 250ms polling", () => {
  assert.match(videoFeedMediaSource, /useEventListener\(player, 'statusChange'/);
  assert.match(videoFeedMediaSource, /useEventListener\(player, 'sourceLoad'/);
  assert.match(videoFeedMediaSource, /useEventListener\(player, 'timeUpdate'/);
  assert.doesNotMatch(videoFeedMediaSource, /setInterval\(/);
  assert.match(videoFeedMediaSource, /videoPlayer\.timeUpdateEventInterval = 0/);
  assert.match(videoFeedMediaSource, /shouldRunFeedVideoTimeUpdates\(isActive, isScreenFocused, appState\) \? 0\.25 : 0/);
});

test("Feed video retry reloads the current source and does not recreate content", () => {
  assert.match(retrySource, /player\.replaceAsync\(uri\)/);
  assert.match(retrySource, /commitFeedVideoSeek/);
  assert.match(retrySource, /applyPlayerSessionState\(\)/);
  assert.doesNotMatch(retrySource, /upload/i);
  assert.doesNotMatch(retrySource, /createMoment/i);
});

test("Feed video stale guards protect autoplay and recovery callbacks", () => {
  assert.match(videoFeedMediaSource, /mediaGenerationRef/);
  assert.match(videoFeedMediaSource, /isCurrentGeneration/);
  assert.match(videoFeedMediaSource, /isStaleFeedVideoGeneration/);
  assert.match(videoFeedMediaSource, /playAttemptInFlightRef/);
  assert.match(videoFeedMediaSource, /recoveryInFlightRef/);
});

test("Fullscreen continues to reuse the same player and recovery path", () => {
  const playerDeclarations = videoFeedMediaSource.match(/\bconst player = useVideoPlayer/g) ?? [];

  assert.equal(playerDeclarations.length, 1);
  assert.match(videoFeedMediaSource, /player=\{player\}/);
  assert.match(videoFeedMediaSource, /handleManualRetry/);
  assert.doesNotMatch(videoFeedMediaSource, /nativeControls=\{true\}/);
});
