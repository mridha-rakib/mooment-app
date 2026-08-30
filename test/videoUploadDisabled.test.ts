import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Video creation/playback is temporarily disabled across the app (resource-
// constrained deploy). Every entry point below is gated behind a local,
// hardcoded `false` constant rather than removed, so it can be restored by
// flipping one value per file. These tests assert the gates are actually
// wired to the right functions/JSX, not just that the constants exist.

const addStorySource = readFileSync(join(process.cwd(), "app/post-screen/add-story.tsx"), "utf8");
const createPostSource = readFileSync(join(process.cwd(), "app/post-screen/create-post.tsx"), "utf8");
const aboutTabSource = readFileSync(join(process.cwd(), "components/eventTabs/AboutTab.tsx"), "utf8");
const attendeeWindowsSource = readFileSync(join(process.cwd(), "components/eventTabs/AttendeeEventWindowsTab.tsx"), "utf8");
const hostWindowsSource = readFileSync(join(process.cwd(), "components/eventTabs/HostEventWindowsTab.tsx"), "utf8");
const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const fullScreenMediaSource = readFileSync(join(process.cwd(), "components/modals/FullScreenMediaModal.tsx"), "utf8");
const chatDetailSource = readFileSync(join(process.cwd(), "app/chat-screen/chat-detail.tsx"), "utf8");

const getFunctionSource = (source: string, name: string, nextMarker: string) => {
  const start = source.indexOf(name);
  assert.notEqual(start, -1, `${name} should exist`);
  const end = source.indexOf(nextMarker, start + 1);
  assert.notEqual(end, -1, `${nextMarker} should exist after ${name}`);
  return source.slice(start, end);
};

test("Story: video creation is disabled by a single flag, not deleted", () => {
  assert.match(addStorySource, /const VIDEO_STORY_CREATION_ENABLED = false;/);
});

test("Story: handleRecordVideo and handlePickVideo both exit immediately when disabled", () => {
  const recordFn = getFunctionSource(addStorySource, "const handleRecordVideo = async () => {", "const handlePickImage");
  const pickFn = getFunctionSource(addStorySource, "const handlePickVideo = async () => {", "const handleCreateTextDraft");

  assert.match(recordFn, /if \(!VIDEO_STORY_CREATION_ENABLED\) return;/);
  assert.match(pickFn, /if \(!VIDEO_STORY_CREATION_ENABLED\) return;/);
});

test("Story: video mode pill and gallery film icon are hidden when disabled", () => {
  assert.match(addStorySource, /VIDEO_STORY_CREATION_ENABLED \? \['image', 'video'\] : \['image'\]/);
  assert.match(addStorySource, /\{VIDEO_STORY_CREATION_ENABLED \? \(\s*<TouchableOpacity[^]*?handlePickVideo/);
});

test("Story: image and text drafts are unaffected — no gate on handleCaptureImage/handleCreateTextDraft", () => {
  const captureFn = getFunctionSource(addStorySource, "const handleCaptureImage = async () => {", "const handleRecordVideo");
  const textFn = getFunctionSource(addStorySource, "const handleCreateTextDraft = () => {", "const publishDraft");

  assert.doesNotMatch(captureFn, /VIDEO_STORY_CREATION_ENABLED/);
  assert.doesNotMatch(textFn, /VIDEO_STORY_CREATION_ENABLED/);
});

test("Moment/Post: video creation is disabled by a single flag, not deleted", () => {
  assert.match(createPostSource, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
});

test("Moment/Post: video toolbar entry and both video modals are gated", () => {
  assert.match(createPostSource, /\{VIDEO_MOMENT_CREATION_ENABLED \? \(\s*<TouchableOpacity style=\{styles\.toolbarItem\} onPress=\{\(\) => setShowVideoPicker\(true\)\}/);

  // While disabled the sheets are not mounted at all — the mount gate, not just
  // a `visible={false}` prop. Exactly one occurrence of each, each inside a
  // `{VIDEO_MOMENT_CREATION_ENABLED && ( ... )}` block.
  assert.equal((createPostSource.match(/<VideoPickerSheet[\s\n]/g) ?? []).length, 1);
  assert.equal((createPostSource.match(/<VideoCameraSheet[\s\n]/g) ?? []).length, 1);
  assert.match(createPostSource, /\{VIDEO_MOMENT_CREATION_ENABLED && \(\s*<VideoPickerSheet\s/);
  assert.match(createPostSource, /\{VIDEO_MOMENT_CREATION_ENABLED && \(\s*<VideoCameraSheet\s/);

  // CameraSheet (image capture) and AudioPickerSheet are NOT behind the video
  // flag — they still mount unconditionally exactly as before.
  assert.match(createPostSource, /<CameraSheet\s+visible=\{showCamera\}/);
  assert.match(createPostSource, /<AudioPickerSheet\s+visible=\{showAudioPicker\}/);
  const beforeCamera = createPostSource.slice(0, createPostSource.indexOf("<CameraSheet"));
  assert.doesNotMatch(
    beforeCamera.slice(beforeCamera.lastIndexOf("{/* ── Modals ── */}")),
    /VIDEO_MOMENT_CREATION_ENABLED/,
  );
});

test("Moment/Post: the actual video upload network call is refused when disabled, even if reached directly", () => {
  const buildMediaItemFn = getFunctionSource(createPostSource, "const buildMediaItem = async ({", "const buildMediaItems = async");

  assert.match(buildMediaItemFn, /if \(type === 'video' && !VIDEO_MOMENT_CREATION_ENABLED\) \{/);
  assert.match(buildMediaItemFn, /throw new Error\('Video posts are temporarily unavailable\.'\);/);
});

test("Event gallery: video is removed from the picker's mediaTypes and the upload builder refuses video", () => {
  assert.match(aboutTabSource, /const EVENT_VIDEO_MEDIA_ENABLED = false;/);
  assert.match(aboutTabSource, /mediaTypes: EVENT_VIDEO_MEDIA_ENABLED \? \["images", "videos"\] : \["images"\]/);

  const buildVideoFn = getFunctionSource(aboutTabSource, "const buildVideoMediaInput = async (", "const handleUploadFromGallery");
  assert.match(buildVideoFn, /if \(!EVENT_VIDEO_MEDIA_ENABLED\) \{/);
});

test("Event window: video is excluded from the attendee's postable content types", () => {
  assert.match(attendeeWindowsSource, /const EVENT_WINDOW_VIDEO_ENABLED = false;/);
  assert.match(attendeeWindowsSource, /types\.filter\(\(type\) => type !== "video"\)/);
  assert.match(attendeeWindowsSource, /postableContentTypes\(window\.allowedContentTypes\)\[0\]/);
  assert.match(attendeeWindowsSource, /postableContentTypes\(selectedWindow\?\.allowedContentTypes/);
});

test("Event window: host can no longer select 'video' as an allowed content type for new/updated windows", () => {
  assert.match(hostWindowsSource, /const EVENT_WINDOW_VIDEO_ENABLED = false;/);
  assert.match(hostWindowsSource, /EVENT_WINDOW_CONTENT_TYPES\.filter\(\(type\) => type !== "video"\)/);
  assert.match(hostWindowsSource, /SELECTABLE_EVENT_WINDOW_CONTENT_TYPES\.map/);
});

test("Feed: video player is never instantiated for a video media item while playback is disabled", () => {
  assert.match(feedPostSource, /const VIDEO_PLAYBACK_ENABLED = false;/);
  assert.match(feedPostSource, /VIDEO_PLAYBACK_ENABLED \? \(\s*<VideoFeedMedia/);
  assert.match(feedPostSource, /<DisabledVideoFeedMedia \/>/);

  // The disabled placeholder itself must contain no player/decoder hooks.
  const disabledComponent = getFunctionSource(
    feedPostSource,
    "const DisabledVideoFeedMedia = React.memo(function DisabledVideoFeedMedia()",
    "const VideoFeedMedia = React.memo",
  );
  assert.doesNotMatch(disabledComponent, /useVideoPlayer/);
  assert.doesNotMatch(disabledComponent, /<VideoView/);
});

test("Feed: retry-video-processing is not reachable from the UI while video is disabled", () => {
  const retryFn = getFunctionSource(feedPostSource, "const handleRetryVideoProcessing = useCallback((index: number) => {", "}, [");
  assert.match(retryFn, /if \(!VIDEO_PLAYBACK_ENABLED\) return;/);
  assert.match(feedPostSource, /canRetry=\{effectiveProcessingStatus === 'failed' && isPostByCurrentUser && VIDEO_PLAYBACK_ENABLED\}/);
});

test("Full-screen media viewer: video player is never instantiated while disabled", () => {
  assert.match(fullScreenMediaSource, /const VIDEO_PLAYBACK_ENABLED = false;/);
  assert.match(fullScreenMediaSource, /VIDEO_PLAYBACK_ENABLED \? \(\s*<FullScreenVideo/);

  const disabledComponent = getFunctionSource(
    fullScreenMediaSource,
    "function FullScreenVideoDisabled()",
    "function FullScreenVideo(",
  );
  assert.doesNotMatch(disabledComponent, /useVideoPlayer/);
  assert.doesNotMatch(disabledComponent, /<VideoView/);
});

test("Chat: video attachment creation remains blocked at its single choke point (pre-existing)", () => {
  assert.match(chatDetailSource, /VIDEO MESSAGING TEMPORARILY DISABLED/);
  assert.match(chatDetailSource, /if \(file\.type === 'video'\) \{/);
});
