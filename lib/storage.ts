import { api } from "@/lib/api";

type UploadFilePayload = {
  uri: string;
  key: string;
  contentType: string;
};

const getBlobFromUri = (uri: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.onload = () => {
      resolve(request.response as Blob);
    };
    request.onerror = () => {
      reject(new Error("Unable to read the selected file."));
    };
    request.responseType = "blob";
    request.open("GET", uri, true);
    request.send(null);
  });

const uploadBlobWithFetch = async (url: string, blob: Blob, contentType: string) => {
  const uploadResponse = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Unable to upload file.");
  }
};

const AUDIO_3GPP_CONTENT_TYPES = new Set(["audio/3gpp", "audio/3gp"]);

const getStreamFilename = (key: string, contentType?: string | null) => {
  const filename = key.split("/").pop() || "file";

  if (contentType && AUDIO_3GPP_CONTENT_TYPES.has(contentType.toLowerCase())) {
    return filename.replace(/\.[^.]+$/, "") + ".3gp";
  }

  return filename;
};

export const getStorageFileUrl = (key: string, contentType?: string | null) => {
  const baseURL = api.defaults.baseURL;

  if (!baseURL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL.");
  }

  const filename = getStreamFilename(key, contentType);
  const contentTypeQuery = contentType ? `&contentType=${encodeURIComponent(contentType)}` : "";

  return `${baseURL}/storage/file/${encodeURIComponent(filename)}?key=${encodeURIComponent(key)}${contentTypeQuery}`;
};

const getStorageUploadUrl = (key: string, contentType: string) => {
  const baseURL = api.defaults.baseURL;

  if (!baseURL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL.");
  }

  return `${baseURL}/storage/upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`;
};

const shouldUseApiUploadProxy = (uploadUrl: string) => {
  const apiBaseUrl = api.defaults.baseURL;

  if (!apiBaseUrl) {
    return false;
  }

  try {
    const uploadHost = new URL(uploadUrl).hostname;
    const apiHost = new URL(apiBaseUrl).hostname;
    const localUploadHosts = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

    return localUploadHosts.has(uploadHost) && !localUploadHosts.has(apiHost);
  } catch {
    return false;
  }
};

export const uploadFileToStorage = async ({ uri, key, contentType }: UploadFilePayload) => {
  const response = await api.post("/storage/upload-url", {
    key,
    contentType,
    expiresIn: contentType.toLowerCase().startsWith("video/") ? 60 * 30 : 60 * 5,
  });
  const uploadUrl = response.data?.data?.url as string | undefined;

  if (!uploadUrl) {
    throw new Error("The upload URL response was incomplete.");
  }

  const blob = await getBlobFromUri(uri);

  try {
    if (shouldUseApiUploadProxy(uploadUrl)) {
      throw new Error("Storage host is not reachable from this device.");
    }

    await uploadBlobWithFetch(uploadUrl, blob, contentType);
  } catch {
    await uploadBlobWithFetch(
      getStorageUploadUrl(key, contentType),
      blob,
      "application/octet-stream",
    );
  }

  return key;
};

export const getStorageDownloadUrl = async (key: string) => {
  const response = await api.get(`/storage/download-url/${encodeURIComponent(key)}`);
  const url = response.data?.data?.url as string | undefined;

  if (!url) {
    throw new Error("The download URL response was incomplete.");
  }

  return url;
};
