export type VideoProcessResult = {
  uri: string;
  contentType: string;
  bytes: number | null;
};

export type VideoProcessProgressCallback = (stage: string, percent: number) => void;

const getUriByteSize = (uri: string): Promise<number | null> =>
  new Promise((resolve) => {
    try {
      const request = new XMLHttpRequest();

      request.responseType = 'blob';
      request.onload = () => resolve((request.response as Blob | null)?.size ?? null);
      request.onerror = () => resolve(null);
      request.ontimeout = () => resolve(null);
      request.timeout = 10_000;
      request.open('GET', uri, true);
      request.send(null);
    } catch {
      resolve(null);
    }
  });

/**
 * Validates the Expo-processed video before upload.
 *
 * Camera videos are encoded by expo-camera at 720p with a bounded bitrate.
 * Gallery videos request the Image Picker H.264 720p export preset on platforms
 * that support it. This final step deliberately fails open: inability to inspect
 * a local URI must never prevent the original playable video from uploading.
 */
export const prepareStoryVideoForUpload = async (
  uri: string,
  contentType: string,
  onProgress: VideoProcessProgressCallback,
): Promise<VideoProcessResult> => {
  onProgress('Checking video...', 0);
  const bytes = await getUriByteSize(uri);
  onProgress('Checking video...', 100);

  return {
    uri,
    contentType,
    bytes,
  };
};
