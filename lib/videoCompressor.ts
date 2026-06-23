const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const SAFETY = 0.92; // target 92% of limit to absorb mux/container overhead
const AUDIO_BITRATE = 128_000; // 128 kbps reserved for audio track

const getUriByteSize = (uri: string): Promise<number> =>
  new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => resolve((xhr.response as Blob).size);
    xhr.onerror = () => resolve(Infinity);
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

const calcVideoBitrate = (durationSeconds: number): number => {
  const targetBits = MAX_BYTES * 8 * SAFETY;
  return Math.max(300_000, Math.floor(targetBits / durationSeconds) - AUDIO_BITRATE);
};

export type VideoCompressResult = { uri: string; contentType: string };
export type CompressProgressCallback = (stage: string, percent: number) => void;

/**
 * Compresses a story video to fit within 5 MB.
 *
 * Uses a dynamic import for react-native-compressor so that a Nitro linking
 * failure at app startup does NOT prevent the camera route from loading.
 * Compression only runs when a video actually exceeds the 5 MB limit.
 */
export const compressStoryVideoIfNeeded = async (
  uri: string,
  durationSeconds: number,
  onProgress: CompressProgressCallback,
): Promise<VideoCompressResult> => {
  onProgress('Checking video...', 0);
  const sizeBytes = await getUriByteSize(uri);
  onProgress('Checking video...', 100);

  if (sizeBytes <= MAX_BYTES) {
    return { uri, contentType: 'video/mp4' };
  }

  const dur = durationSeconds > 0 ? durationSeconds : 15;
  onProgress('Compressing video...', 0);

  // Dynamic import: module initialization (including NitroModules.createHybridObject)
  // is deferred until compression is actually needed, so module-load failures
  // never crash the route at startup.
  const { Video } = await import('react-native-compressor');

  // First pass — 720p cap, bitrate tuned to hit ~5 MB
  const firstUri = await Video.compress(
    uri,
    {
      compressionMethod: 'manual',
      bitrate: calcVideoBitrate(dur),
      maxSize: 1280,
    },
    (p) => onProgress('Compressing video...', Math.round(p * 100)),
  );

  const firstSize = await getUriByteSize(firstUri);
  if (firstSize <= MAX_BYTES) {
    return { uri: firstUri, contentType: 'video/mp4' };
  }

  // Second pass — 480p cap, 55% of first-pass bitrate
  onProgress('Compressing video...', 0);
  const secondUri = await Video.compress(
    uri,
    {
      compressionMethod: 'manual',
      bitrate: Math.floor(calcVideoBitrate(dur) * 0.55),
      maxSize: 854,
    },
    (p) => onProgress('Compressing video...', Math.round(p * 100)),
  );

  const secondSize = await getUriByteSize(secondUri);
  if (secondSize > MAX_BYTES) {
    const sizeMB = (secondSize / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Could not compress video below 5 MB (reached ${sizeMB} MB). Please record a shorter clip.`,
    );
  }

  return { uri: secondUri, contentType: 'video/mp4' };
};
