import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Feed media images render via expo-image (ExpoImage), which bypasses the
// axios `api` instance entirely, so it never picks up the
// ngrok-skip-browser-warning header that api.ts attaches to every axios
// request against an ngrok-free tunnel. Without the header, ngrok serves its
// HTML interstitial instead of the real file, and the image silently never
// decodes — this is the root cause of the Feed/Discover blank media bug.
const apiSource = readFileSync(join(process.cwd(), "lib/api.ts"), "utf8").replace(/\r\n/g, "\n");
const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8").replace(/\r\n/g, "\n");

const croppedFeedImageSource = feedPostSource.slice(
  feedPostSource.indexOf("function CroppedFeedImage"),
  feedPostSource.indexOf("const formatAudioSeconds"),
);

test("isNgrokUrl is exported from lib/api.ts as the single source of truth", () => {
  assert.match(apiSource, /export const isNgrokUrl = \(url: string \| undefined\) => \{/);
  assert.match(apiSource, /new URL\(url\)\.hostname\.includes\("ngrok-free"\)/);
});

test("isNgrokUrl correctly classifies ngrok vs. production hosts", async () => {
  // Extract and evaluate the pure function in isolation (it only touches the
  // global URL constructor, so it's safe to run outside the RN/Expo runtime
  // that the rest of api.ts depends on).
  const match = apiSource.match(/export const isNgrokUrl = \(url: string \| undefined\) => \{[\s\S]*?\n\};/);
  assert.ok(match, "expected to locate the isNgrokUrl implementation");

  const plainJs = match![0]
    .replace("export const", "const")
    .replace("(url: string | undefined)", "(url)");
  const isNgrokUrl = new Function(`${plainJs}\nreturn isNgrokUrl;`)();

  assert.equal(isNgrokUrl("https://abc123.ngrok-free.app/api/v1"), true);
  assert.equal(isNgrokUrl("https://abc123.ngrok-free.app/storage/file/x?key=y"), true);
  assert.equal(isNgrokUrl("https://api.production.com"), false);
  assert.equal(isNgrokUrl("http://localhost:4000/api/v1"), false);
  assert.equal(isNgrokUrl(undefined), false);
  assert.equal(isNgrokUrl(""), false);
  // Malformed URLs must not throw — falls back to a plain substring check.
  assert.equal(isNgrokUrl("not a url but has ngrok-free in it"), true);
  assert.equal(isNgrokUrl("not a url at all"), false);
});

test("ngrokSkipWarningHeaders reuses isNgrokUrl and only adds the header for ngrok hosts", () => {
  assert.match(
    apiSource,
    /export const ngrokSkipWarningHeaders = \(url: string \| undefined\) =>\s*isNgrokUrl\(url\) \? \{ "ngrok-skip-browser-warning": "true" \} : undefined;/,
  );
});

test("CroppedFeedImage attaches ngrok headers to both ExpoImage call sites via a shared imageSource", () => {
  assert.match(
    croppedFeedImageSource,
    /const imageSource = useMemo\(\(\) => \(\{\s*uri: resolvedUri,\s*headers: ngrokSkipWarningHeaders\(resolvedUri\),\s*\}\), \[resolvedUri\]\);/,
  );
  // Both the uncropped and cropped ExpoImage branches must use it — a
  // leftover `source={{ uri: resolvedUri }}` would silently skip the header
  // fix for whichever branch still has it.
  assert.equal((croppedFeedImageSource.match(/source=\{imageSource\}/g) ?? []).length, 2);
  assert.doesNotMatch(croppedFeedImageSource, /source=\{\{ uri: resolvedUri \}\}/);
});

test("the crop-measurement Image.getSizeWithHeaders call also carries the ngrok header", () => {
  assert.match(croppedFeedImageSource, /Image\.getSizeWithHeaders\(\s*resolvedUri,\s*imageSource\.headers \?\? \{\},/);
});

test("full-screen media items carry the same per-item ngrok headers into FullScreenMediaModal", () => {
  const fullScreenSection = feedPostSource.slice(
    feedPostSource.indexOf("const fullScreenMediaItems = useMemo"),
    feedPostSource.indexOf("const isEmbeddedTextOnly"),
  );
  assert.match(fullScreenSection, /headers: ngrokSkipWarningHeaders\(uri\),/);
});

test("audio playback reuses the shared ngrokSkipWarningHeaders helper instead of a duplicated inline check", () => {
  const audioPlayerSection = feedPostSource.slice(
    feedPostSource.indexOf("function AudioFeedPlayer"),
    feedPostSource.indexOf("function AudioFeedPlayer") + 1500,
  );
  assert.match(audioPlayerSection, /headers: ngrokSkipWarningHeaders\(details\.uri\),/);
  assert.doesNotMatch(feedPostSource, /details\.uri\.includes\('ngrok-free'\)/);
});

test("isLoading no longer depends solely on onLoadStart firing", () => {
  assert.match(croppedFeedImageSource, /const \[isLoading, setIsLoading\] = useState\(\(\) => Boolean\(resolvedUri\)\);/);
  assert.match(
    croppedFeedImageSource,
    /previousImageIdentityRef\.current = resolvedUri;\s*setLoadAttempt\(0\);\s*setIsLoading\(Boolean\(resolvedUri\)\);/,
  );
});

test("the watchdog and error handler resolve to a deterministic loading/error state and never both retry and error at once", () => {
  assert.match(croppedFeedImageSource, /if \(!isCurrentRequest\(requestIdentity\) \|\| didLoadRef\.current\) \{\s*return;\s*\}/);
  assert.match(
    croppedFeedImageSource,
    /if \(loadAttempt < FEED_IMAGE_MAX_RECOVERY_ATTEMPTS\) \{\s*setIsLoading\(true\);\s*setLoadAttempt\(loadAttempt \+ 1\);\s*\} else \{\s*setIsLoading\(false\);\s*setHasLoadError\(true\);\s*\}/g,
  );
});
