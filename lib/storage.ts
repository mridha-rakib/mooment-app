import { api } from "@/lib/api";

type UploadFilePayload = {
  uri: string;
  key: string;
  contentType: string;
  onProgress?: (progress: number) => void;
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
    request.ontimeout = () => {
      reject(new Error("Timed out while reading the selected file."));
    };
    request.timeout = 15000;
    request.responseType = "blob";
    request.open("GET", uri, true);
    request.send(null);
  });

const uploadBlobWithFetch = async (url: string, blob: Blob, contentType: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let uploadResponse: Response;

  try {
    uploadResponse = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: blob,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("File upload timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!uploadResponse.ok) {
    throw new Error("Unable to upload file.");
  }
};

const uploadBlobWithProgress = (
  url: string,
  blob: Blob,
  contentType: string,
  timeoutMs: number,
  onProgress?: (progress: number) => void,
) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.timeout = timeoutMs;
    request.open("PUT", url, true);
    request.setRequestHeader("Content-Type", contentType);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(1, Math.max(0, event.loaded / event.total)));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }

      reject(new Error("Unable to upload file."));
    };
    request.onerror = () => reject(new Error("Unable to upload file."));
    request.ontimeout = () => reject(new Error("File upload timed out."));
    request.send(blob);
  });

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
  try {
    const uploadHost = new URL(uploadUrl).hostname;
    const localUploadHosts = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

    // Local MinIO addresses are meaningful only on the development computer
    // or emulator. Always use the API proxy so physical devices do not hang on
    // an unreachable presigned URL/port.
    return localUploadHosts.has(uploadHost);
  } catch {
    return false;
  }
};

export const uploadFileToStorage = async ({ uri, key, contentType, onProgress }: UploadFilePayload) => {
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

  const isVideo = contentType.toLowerCase().startsWith("video/");
  const directTimeoutMs = isVideo ? 30 * 60 * 1000 : 90 * 1000;
  const fallbackTimeoutMs = isVideo ? 30 * 60 * 1000 : 60 * 1000;

  try {
    if (shouldUseApiUploadProxy(uploadUrl)) {
      throw new Error("Storage host is not reachable from this device.");
    }

    if (onProgress) {
      await uploadBlobWithProgress(uploadUrl, blob, contentType, directTimeoutMs, onProgress);
    } else {
      await uploadBlobWithFetch(uploadUrl, blob, contentType, directTimeoutMs);
    }
  } catch {
    const fallbackUrl = getStorageUploadUrl(key, contentType);
    if (onProgress) {
      await uploadBlobWithProgress(fallbackUrl, blob, "application/octet-stream", fallbackTimeoutMs, onProgress);
    } else {
      await uploadBlobWithFetch(fallbackUrl, blob, "application/octet-stream", fallbackTimeoutMs);
    }
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
