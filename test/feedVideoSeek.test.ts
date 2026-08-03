import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

type FeedVideoSeekModule = typeof import("../lib/feedVideoSeek");

const feedVideoSeekModulePath = "../lib/feedVideoSeek" + ".ts";
const {
  clampFeedVideoSeekTarget,
  commitFeedVideoSeek,
  getFeedVideoSeekTargetFromLocation,
} = await import(feedVideoSeekModulePath) as FeedVideoSeekModule;
type FeedVideoSeekPlayer = Parameters<typeof commitFeedVideoSeek>[0]["player"];

const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const videoFeedMediaSource = feedPostSource.slice(
  feedPostSource.indexOf("const VideoFeedMedia"),
  feedPostSource.indexOf("function CroppedFeedImage"),
);
const progressPanResponderSource = videoFeedMediaSource.slice(
  videoFeedMediaSource.indexOf("const progressPanResponder"),
  videoFeedMediaSource.indexOf("const handleManualRetry"),
);
const panMoveSource = progressPanResponderSource.slice(
  progressPanResponderSource.indexOf("onPanResponderMove"),
  progressPanResponderSource.indexOf("onPanResponderRelease"),
);
const panReleaseSource = progressPanResponderSource.slice(
  progressPanResponderSource.indexOf("onPanResponderRelease"),
  progressPanResponderSource.indexOf("onPanResponderTerminate"),
);
const progressPressSource = videoFeedMediaSource.slice(
  videoFeedMediaSource.indexOf("const handleProgressPress"),
  videoFeedMediaSource.indexOf("const renderControls"),
);

test("Feed video uses expo-video currentTime for absolute seeking, not seekTo", () => {
  assert.doesNotMatch(videoFeedMediaSource, /\.seekTo\s*\(/);
  assert.match(videoFeedMediaSource, /commitFeedVideoSeek/);
  assert.match(videoFeedMediaSource, /player\.currentTime/);
});

test("progress tap location resolves to an absolute clamped target", () => {
  assert.equal(getFeedVideoSeekTargetFromLocation(50, 200, 60), 15);
  assert.equal(getFeedVideoSeekTargetFromLocation(-20, 200, 60), 0);
  assert.equal(getFeedVideoSeekTargetFromLocation(240, 200, 60), 60);
  assert.equal(clampFeedVideoSeekTarget(61, 60), 60);
  assert.equal(clampFeedVideoSeekTarget(-1, 60), 0);
});

test("invalid duration, width, or position cannot seek or crash", () => {
  assert.equal(getFeedVideoSeekTargetFromLocation(50, 0, 60), null);
  assert.equal(getFeedVideoSeekTargetFromLocation(50, 200, 0), null);
  assert.equal(getFeedVideoSeekTargetFromLocation(Number.NaN, 200, 60), null);
  assert.equal(getFeedVideoSeekTargetFromLocation(50, Number.POSITIVE_INFINITY, 60), null);
  assert.equal(clampFeedVideoSeekTarget(10, Number.NaN), null);
});

test("committed seek writes currentTime synchronously and keeps playback active", () => {
  let playCalls = 0;
  const player: FeedVideoSeekPlayer = {
    currentTime: 0,
    playing: false,
    play: () => {
      playCalls += 1;
      player.playing = true;
    },
  };

  const result = commitFeedVideoSeek({
    player,
    targetSeconds: 18,
    durationSeconds: 60,
    expectedMediaId: "video-a",
    currentMediaId: "video-a",
    keepPlaying: true,
  });

  assert.deepEqual(result, { ok: true, targetSeconds: 18 });
  assert.equal(player.currentTime, 18);
  assert.equal(playCalls, 1);
});

test("committed seek clamps to duration and leaves mute state untouched", () => {
  const player = {
    currentTime: 0,
    muted: true,
    playing: true,
    play: () => {
      throw new Error("play should not be called while already playing");
    },
  };

  const result = commitFeedVideoSeek({
    player,
    targetSeconds: 90,
    durationSeconds: 60,
    expectedMediaId: "video-a",
    currentMediaId: "video-a",
    keepPlaying: true,
  });

  assert.deepEqual(result, { ok: true, targetSeconds: 60 });
  assert.equal(player.currentTime, 60);
  assert.equal(player.muted, true);
});

test("stale recycled media identity cannot seek another video", () => {
  const player: FeedVideoSeekPlayer = { currentTime: 4, playing: true };

  const result = commitFeedVideoSeek({
    player,
    targetSeconds: 20,
    durationSeconds: 60,
    expectedMediaId: "old-video",
    currentMediaId: "new-video",
    keepPlaying: true,
  });

  assert.deepEqual(result, { ok: false, reason: "stale_media" });
  assert.equal(player.currentTime, 4);
});

test("seek failure is contained without throwing or returning a Promise", () => {
  let logged = false;
  const player = {
    get currentTime() {
      return 0;
    },
    set currentTime(_value: number) {
      throw new Error("native seek failed");
    },
    playing: true,
  };

  const result = commitFeedVideoSeek({
    player,
    targetSeconds: 20,
    durationSeconds: 60,
    expectedMediaId: "video-a",
    currentMediaId: "video-a",
    keepPlaying: true,
    onError: () => {
      logged = true;
    },
  });

  assert.deepEqual(result, { ok: false, reason: "player_error" });
  assert.equal(logged, true);
  assert.equal(typeof ((result as unknown) as Promise<unknown> & { then?: unknown }).then, "undefined");
});

test("drag previews locally and commits the native seek once on release", () => {
  assert.match(panMoveSource, /previewSeekPosition/);
  assert.doesNotMatch(panMoveSource, /commitSeekFromLocation/);
  assert.match(panReleaseSource, /commitSeekFromLocation/);
});

test("tap and drag restart controls auto-hide without toggling mute or playback", () => {
  assert.match(progressPressSource, /commitSeekFromLocation/);
  assert.match(progressPressSource, /scheduleHideControls/);
  assert.match(panReleaseSource, /scheduleHideControls\(\{ isDragging: false \}\)/);
  assert.doesNotMatch(progressPressSource, /handleToggleMute/);
  assert.doesNotMatch(progressPressSource, /player\.pause\(/);
});

test("fullscreen reuses the same seek controls and does not create a duplicate player", () => {
  const playerDeclarations = videoFeedMediaSource.match(/\bconst player = useVideoPlayer/g) ?? [];

  assert.equal(playerDeclarations.length, 1);
  assert.match(videoFeedMediaSource, /\{renderControls\(true\)\}/);
  assert.doesNotMatch(videoFeedMediaSource, /nativeControls=\{true\}/);
});

test("Feed video does not introduce transport controls", () => {
  assert.doesNotMatch(videoFeedMediaSource, /name=\{?"(?:play|pause|skip-back|skip-forward|rewind|fast-forward)"\}?/);
  assert.doesNotMatch(videoFeedMediaSource, /accessibilityLabel="(?:Play|Pause|Rewind|Forward|Previous|Next)/);
});
