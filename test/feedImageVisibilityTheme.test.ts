import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(
  join(process.cwd(), 'components/post/FeedPost.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');

const imageRenderer = source.slice(
  source.indexOf('function CroppedFeedImage'),
  source.indexOf('const formatAudioSeconds'),
);

test('feed image loading surface uses the existing light/dark theme token without tinting the image', () => {
  assert.match(imageRenderer, /const \{ colors \} = useTheme\(\);/);
  assert.match(imageRenderer, /const mediaSurfaceColor = colors\.backgroundSecondary;/);
  assert.doesNotMatch(imageRenderer, /opacity:\s*[0-9.]+/);
  assert.doesNotMatch(imageRenderer, /tintColor/);
});

test('feed image loader is transparent, non-interactive, and only ends after image decode', () => {
  assert.match(imageRenderer, /<View pointerEvents="none" style=\{styles\.imageLoadingOverlay\}>/);
  assert.match(imageRenderer, /<ActivityIndicator color=\{colors\.primary\} \/>/);
  assert.match(
    imageRenderer,
    /const handleImageLoadEnd = useCallback\(\(\) => \{[\s\S]*?if \(didLoadRef\.current\) \{\s*setIsLoading\(false\);\s*\}/,
  );
  assert.match(source, /imageLoadingOverlay:\s*\{[\s\S]*?backgroundColor: 'transparent'/);
});

test('feed image touch frame explicitly fills and clips the media slide', () => {
  assert.match(
    source,
    /mediaImageButton:\s*\{\s*flex: 1,\s*width: '100%',\s*height: '100%',\s*overflow: 'hidden',/,
  );
});
