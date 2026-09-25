import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const mapper = read('lib/momentPostMapper.ts');
const feedPost = read('components/post/FeedPost.tsx');
const renderer = feedPost.slice(
  feedPost.indexOf('function CroppedFeedImage'),
  feedPost.indexOf('const formatAudioSeconds'),
);

test('storage-backed feed media retains the API URL as a recovery source', () => {
  assert.match(mapper, /const fallbackUri = mediaItem\.type === "image" && mediaItem\.storageKey && mediaItem\.url && mediaItem\.url !== uri/);
  assert.match(mapper, /fallbackUri,/);
  assert.match(feedPost, /fallbackUri\?: string \| null;/);
});

test('a failed storage stream switches once to the retained API URL before showing fallback UI', () => {
  assert.match(renderer, /const canTryFallback = Boolean\([\s\S]*?fallbackUri[\s\S]*?resolvedUri === primaryUri[\s\S]*?!fallbackAttemptedRef\.current/);
  assert.match(renderer, /fallbackAttemptedRef\.current = true;\s*setIsLoading\(true\);\s*setHasLoadError\(false\);\s*setActiveUri\(fallbackUri\);\s*return;/);
});

test('a carousel/source refresh resets both the URI and recovery state', () => {
  assert.match(renderer, /const mediaIdentity = `\$\{primaryUri\}\\u0000\$\{fallbackUri \?\? ''\}`;/);
  assert.match(renderer, /fallbackAttemptedRef\.current = false;[\s\S]*?setLoadAttempt\(0\);\s*setIsLoading\(Boolean\(primaryUri\)\);\s*setHasLoadError\(false\);\s*setActiveUri\(primaryUri\);/);
  assert.match(renderer, /const imageInstanceKey = requestIdentity;/);
  assert.match(renderer, /const isFreshMediaObject = previousMediaItemRef\.current !== item;/);
  assert.match(renderer, /if \(previousMediaIdentityRef\.current === mediaIdentity && !isFreshMediaObject\)/);
  assert.match(renderer, /const requestIdentity = `\$\{mediaIdentity\}\\u0000\$\{requestRevision\}\\u0000\$\{resolvedUri\}\\u0000\$\{loadAttempt\}`;/);
});

test('late callbacks from an earlier image request cannot update refreshed media state', () => {
  assert.match(renderer, /const activeRequestIdentityRef = useRef\(requestIdentity\);/);
  assert.match(renderer, /activeRequestIdentityRef\.current = requestIdentity;/);
  assert.match(renderer, /if \(!isCurrentRequest\(requestIdentity\)\) return;/g);
  assert.match(renderer, /if \(!isCurrentRequest\(requestIdentity\) \|\| hasLoadError \|\| didLoadRef\.current\)/);
});

test('failure diagnostics redact signed query values and remain development-only', () => {
  assert.match(renderer, /if \(__DEV__\) \{/);
  assert.match(renderer, /console\.debug\('\[FeedImage\] mount'/);
  assert.match(renderer, /console\.debug\('\[FeedImage\] unmount'/);
  assert.match(renderer, /return `\$\{parsed\.origin\}\$\{parsed\.pathname\}\$\{parsed\.search \? '\?…' : ''\}`;/);
  assert.match(renderer, /console\.warn\('\[FeedImage\] load failed'/);
});
