import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Follows the same source-string testing convention as
// test/feedVideoPlayback.test.ts: this repo has no component-rendering test
// library installed, so behavior is verified by asserting on the exact
// FeedPost.tsx / lib source text rather than by mounting components.
const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const momentsLibSource = readFileSync(join(process.cwd(), "lib/moments.ts"), "utf8");
const profileContentSource = readFileSync(join(process.cwd(), "components/profile/ProfileContent.tsx"), "utf8");
const repostFeedCardSource = readFileSync(join(process.cwd(), "components/post/RepostFeedCard.tsx"), "utf8");

const placeholderComponentSource = feedPostSource.slice(
  feedPostSource.indexOf("const VideoProcessingPlaceholder"),
  feedPostSource.indexOf("function CroppedFeedImage"),
);
const retryHandlerSource = feedPostSource.slice(
  feedPostSource.indexOf("const handleRetryVideoProcessing"),
  feedPostSource.indexOf("const resolvedEventId"),
);
const mediaRenderBranchSource = feedPostSource.slice(
  feedPostSource.indexOf("{mediaItems.map((item, index) => {"),
  feedPostSource.indexOf("</ScrollView>"),
);
const retryFunctionSource = momentsLibSource.slice(
  momentsLibSource.indexOf("export const retryMomentVideoProcessing"),
  momentsLibSource.indexOf("export const toggleMomentReaction"),
);

test("queued and processing videos render the placeholder branch, never VideoFeedMedia", () => {
  assert.match(mediaRenderBranchSource, /effectiveProcessingStatus === 'queued'/);
  assert.match(mediaRenderBranchSource, /effectiveProcessingStatus === 'processing'/);
  assert.match(mediaRenderBranchSource, /isVideoNotYetPlayable \? \(\s*<VideoProcessingPlaceholder/);
  // VideoFeedMedia is only reachable from the non-placeholder branch.
  const videoFeedMediaCallSites = mediaRenderBranchSource.match(/<VideoFeedMedia/g) ?? [];
  assert.equal(videoFeedMediaCallSites.length, 1);
  assert.match(mediaRenderBranchSource, /\) : item\.type === 'video' \? \(\s*<VideoFeedMedia/);
});

test("VideoProcessingPlaceholder never mounts a real video player", () => {
  assert.doesNotMatch(placeholderComponentSource, /VideoView/);
  assert.doesNotMatch(placeholderComponentSource, /useVideoPlayer/);
});

test("queued state shows a lightweight, non-alarming placeholder", () => {
  assert.match(placeholderComponentSource, /status === 'queued' \?[\s\S]*?Video queued for processing/);
});

test("processing state shows a clear processing indicator with no play controls", () => {
  assert.match(placeholderComponentSource, /status === 'processing' \?[\s\S]*?ActivityIndicator/);
  assert.match(placeholderComponentSource, /Processing video/);
});

test("failed state renders a safe, user-friendly message with no internal details", () => {
  const failedBranchSource = placeholderComponentSource.slice(
    placeholderComponentSource.indexOf("status === 'failed'"),
    placeholderComponentSource.lastIndexOf("</>"),
  );

  assert.match(failedBranchSource, /This video couldn&apos;t be processed\./);
  assert.doesNotMatch(placeholderComponentSource, /ffmpeg/i);
  assert.doesNotMatch(placeholderComponentSource, /jobId|job_id/i);
  assert.doesNotMatch(placeholderComponentSource, /storageKey|storage_key/i);
  assert.doesNotMatch(placeholderComponentSource, /attempts/i);
  assert.doesNotMatch(placeholderComponentSource, /processingErrorCode/);
});

test("Retry is gated on ownership via the existing isPostByCurrentUser flag", () => {
  assert.match(mediaRenderBranchSource, /canRetry=\{effectiveProcessingStatus === 'failed' && isPostByCurrentUser\}/);
});

test("owner-only canRetry prop drives whether the Retry button renders", () => {
  assert.match(placeholderComponentSource, /\{canRetry \? \(\s*<TouchableOpacity/);
});

test("Retry calls the exact retry-video-processing endpoint with no request body", () => {
  assert.match(retryFunctionSource, /api\.post\(`\/moments\/\$\{encodeURIComponent\(momentId\)\}\/retry-video-processing`\)/);
  // Only the URL argument is passed — no job id / storage key / user id body.
  assert.doesNotMatch(retryFunctionSource, /api\.post\([^)]*,\s*\{/);
});

test("retry handler invokes retryMomentVideoProcessing with only the post id", () => {
  assert.match(retryHandlerSource, /retryMomentVideoProcessing\(post\.id\)/);
});

test("duplicate retry taps while a request is in flight are blocked", () => {
  const guardSource = retryHandlerSource.slice(0, retryHandlerSource.indexOf("setRetryPendingIndexes((prev) => new Set(prev).add(index));"));

  assert.match(guardSource, /if \(retryPendingIndexes\.has\(index\)\) \{\s*return;\s*\}/);
});

test("a successful retry marks the item as locally retried, surfaced as queued", () => {
  const trySource = retryHandlerSource.slice(retryHandlerSource.indexOf("try {"), retryHandlerSource.indexOf("} catch"));

  assert.match(trySource, /await retryMomentVideoProcessing\(post\.id\);/);
  assert.match(trySource, /setLocallyRetriedIndexes/);
  assert.match(mediaRenderBranchSource, /rawProcessingStatus === 'failed' && locallyRetriedIndexes\.has\(index\)\s*\?\s*'queued'/);
});

test("a failed retry does not mark the item as retried, so the failed state is preserved", () => {
  const catchSource = retryHandlerSource.slice(retryHandlerSource.indexOf("} catch"), retryHandlerSource.indexOf("} finally"));

  assert.doesNotMatch(catchSource, /setLocallyRetriedIndexes/);
  assert.match(catchSource, /Alert\.alert\('Unable to retry video', getAuthErrorMessage\(error, 'Please try again\.'\)\)/);
});

test("ready and legacy (undefined processingStatus) videos use VideoFeedMedia with its original, unmodified props", () => {
  assert.match(
    mediaRenderBranchSource,
    /<VideoFeedMedia uri=\{item\.uri\} isActive=\{Boolean\(isActiveVideo && currentMediaIndex === index && !showFullScreenMedia\)\} \/>/,
  );
  // "ready" and legacy (no processingStatus at all) are not in the blocking
  // set, so they fall through to the untouched VideoFeedMedia branch.
  assert.doesNotMatch(mediaRenderBranchSource, /effectiveProcessingStatus === 'ready'/);
});

test("image media rendering is untouched by the processing-state branch", () => {
  assert.match(
    mediaRenderBranchSource,
    /<CroppedFeedImage item=\{item\} frameWidth=\{mediaFrameWidth\} frameHeight=\{isNormalPost \? mediaFrameWidth : 340\} \/>/,
  );
});

test("Profile timeline and reposts render through the same FeedPost component, so they inherit identical processing-state behavior", () => {
  assert.match(profileContentSource, /import FeedPost/);
  assert.match(repostFeedCardSource, /import FeedPost/);
});
