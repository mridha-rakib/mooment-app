import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");

const croppedFeedImageSource = feedPostSource.slice(
  feedPostSource.indexOf("function CroppedFeedImage"),
  feedPostSource.indexOf("const formatAudioSeconds"),
);

const imageSizeResetEffectSource = croppedFeedImageSource.slice(
  croppedFeedImageSource.indexOf("useEffect(() => {\n    const nextWidth = item.displayCrop?.imageWidth ?? 0;"),
  croppedFeedImageSource.indexOf("  }, [item.displayCrop?.imageHeight, item.displayCrop?.imageWidth, resolvedUri]);") + "  }, [item.displayCrop?.imageHeight, item.displayCrop?.imageWidth, resolvedUri]);".length,
);

test("imageSize reset effect preserves the current object when incoming dimensions match", () => {
  assert.match(imageSizeResetEffectSource, /setImageSize\(\(current\) => \{/);
  assert.match(imageSizeResetEffectSource, /if \(current\.width === nextWidth && current\.height === nextHeight\) \{\s*return current;\s*\}/);
});

test("imageSize reset effect still updates when incoming dimensions differ", () => {
  assert.match(imageSizeResetEffectSource, /return \{\s*width: nextWidth,\s*height: nextHeight,\s*\};/);
});

test("Image.getSize fallback remains intact for missing dimensions", () => {
  assert.match(croppedFeedImageSource, /if \(imageSize\.width > 0 && imageSize\.height > 0\) \{\s*return;\s*\}/);
  assert.match(croppedFeedImageSource, /Image\.getSize\(/);
  assert.match(croppedFeedImageSource, /setImageSize\(\{ width: resolvedWidth, height: resolvedHeight \}\);/);
  assert.match(croppedFeedImageSource, /setImageSize\(\{ width: 0, height: 0 \}\);/);
});

test("crop rendering, cache policy, and recovery key remain unchanged", () => {
  assert.match(croppedFeedImageSource, /const imageInstanceKey = `\$\{resolvedUri\}-\$\{loadAttempt\}`;/);
  assert.match(croppedFeedImageSource, /contentFit="cover"/);
  assert.match(croppedFeedImageSource, /contentFit="fill"/);
  assert.equal((croppedFeedImageSource.match(/cachePolicy="memory-disk"/g) ?? []).length, 2);
  assert.match(croppedFeedImageSource, /const cropPixelWidth = Math\.max\(crop\.width \* imageSize\.width, 1\);/);
  assert.match(croppedFeedImageSource, /const cropPixelHeight = Math\.max\(crop\.height \* imageSize\.height, 1\);/);
});
