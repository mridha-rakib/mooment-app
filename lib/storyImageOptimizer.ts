import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_STORY_LONG_SIDE = 1920;
const MAX_STORY_SHORT_SIDE = 1080;
const STORY_IMAGE_UPLOAD_QUALITY = 0.82;

type OptimizeStoryImageOptions = {
  uri: string;
  width?: number | null;
  height?: number | null;
  contentType?: string | null;
};

export type OptimizedStoryImage = {
  uri: string;
  width: number;
  height: number;
  contentType: 'image/jpeg';
  resized: boolean;
};

const calculateResize = (width?: number | null, height?: number | null) => {
  if (!width || !height || width <= 0 || height <= 0) {
    return null;
  }

  const isLandscape = width >= height;
  const maxWidth = isLandscape ? MAX_STORY_LONG_SIDE : MAX_STORY_SHORT_SIDE;
  const maxHeight = isLandscape ? MAX_STORY_SHORT_SIDE : MAX_STORY_LONG_SIDE;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  if (scale >= 1) {
    return null;
  }

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

export const optimizeStoryImageForUpload = async ({
  uri,
  width,
  height,
}: OptimizeStoryImageOptions): Promise<OptimizedStoryImage> => {
  const resize = calculateResize(width, height);
  const actions = resize ? [{ resize }] : [];
  const result = await manipulateAsync(uri, actions, {
    compress: STORY_IMAGE_UPLOAD_QUALITY,
    format: SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    contentType: 'image/jpeg',
    resized: Boolean(resize),
  };
};
