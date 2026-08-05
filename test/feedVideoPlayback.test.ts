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
const videoSourceDeclarationSource = videoFeedMediaSource.slice(
  videoFeedMediaSource.indexOf("const videoSource = useMemo"),
  videoFeedMediaSource.indexOf("const player = useVideoPlayer"),
);
const playerSetupSource = videoFeedMediaSource.slice(
  videoFeedMediaSource.indexOf("const player = useVideoPlayer"),
  videoFeedMediaSource.indexOf("const wasActiveRef"),
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

test("Feed video retry reloads the current cached source and does not recreate content", () => {
  assert.match(retrySource, /player\.replaceAsync\(videoSource\)/);
  assert.match(retrySource, /commitFeedVideoSeek/);
  assert.match(retrySource, /applyPlayerSessionState\(\)/);
  assert.doesNotMatch(retrySource, /upload/i);
  assert.doesNotMatch(retrySource, /createMoment/i);
});

test("Feed video passes a memoized cached source object instead of a raw URI string", () => {
  assert.doesNotMatch(videoFeedMediaSource, /useVideoPlayer\(uri,/);
  assert.match(videoFeedMediaSource, /useVideoPlayer\(videoSource,/);
  assert.match(videoSourceDeclarationSource, /useMemo<VideoSourceObject>/);
  assert.match(videoSourceDeclarationSource, /uri,/);
  assert.match(videoSourceDeclarationSource, /useCaching: true,/);
  assert.match(videoSourceDeclarationSource, /\}\), \[uri\]\)/);
  assert.doesNotMatch(videoSourceDeclarationSource, /Date\.now\(\)|Math\.random\(\)|timestamp|nonce|cacheBust|cache-bust/i);
});

test("Cached video source keeps loop, mute, and time-update interval setup unchanged", () => {
  assert.match(playerSetupSource, /videoPlayer\.loop = true/);
  assert.match(playerSetupSource, /videoPlayer\.muted = momentVideoSessionMuted/);
  assert.match(playerSetupSource, /videoPlayer\.timeUpdateEventInterval = 0/);
});

test("replaceAsync is only ever invoked to reload the source (retry/resume) or to release it (inactive)", () => {
  const replaceAsyncCallSites = videoFeedMediaSource.match(/\.replaceAsync\(/g) ?? [];

  // One reload call site, shared by the manual-retry path and the
  // resume-after-release path (both call handleManualRetry), plus one
  // release call site (replaceAsync(null)) in the isPlaybackActive effect
  // that stops an inactive/off-screen card from buffering.
  assert.equal(replaceAsyncCallSites.length, 2);
  assert.match(videoFeedMediaSource, /player\.replaceAsync\(videoSource\)/);
  assert.match(videoFeedMediaSource, /player\.replaceAsync\(null\)/);
});

test("an inactive/off-screen card releases its loaded source instead of continuing to buffer", () => {
  const isPlaybackActiveEffectSource = videoFeedMediaSource.slice(
    videoFeedMediaSource.indexOf("useEffect(() => {\n    if (isPlaybackActive) {"),
    videoFeedMediaSource.indexOf("wasActiveRef.current = isPlaybackActive;"),
  );

  assert.match(isPlaybackActiveEffectSource, /player\.replaceAsync\(null\)/);
  assert.match(isPlaybackActiveEffectSource, /sourceLoadedRef\.current = false/);
});

test("reactivating a released card reloads the source via the retry/resume path, not a raw tryPlay", () => {
  const isPlaybackActiveEffectSource = videoFeedMediaSource.slice(
    videoFeedMediaSource.indexOf("useEffect(() => {\n    if (isPlaybackActive) {"),
    videoFeedMediaSource.indexOf("wasActiveRef.current = isPlaybackActive;"),
  );

  assert.match(isPlaybackActiveEffectSource, /if \(sourceLoadedRef\.current\) \{\s*void tryPlay\(/);
  assert.match(isPlaybackActiveEffectSource, /\} else \{[\s\S]*?void handleManualRetry\(\);/);
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
