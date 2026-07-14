import { api } from "@/lib/api";
import * as FileSystem from "expo-file-system/legacy";

type UploadFilePayload = {
  uri: string;
  key: string;
  contentType: string;
  onProgress?: (progress: number) => void;
};

type StartStorageUploadPayload = UploadFilePayload & {
  expiresIn?: number;
};

type StartedStorageUpload = {
  key: string;
  completion: Promise<string>;
  cancel: () => Promise<void>;
};

const createStorageTiming = (key: string) => {
  const enabled = __DEV__ && key.startsWith("stories/");
  const startedAt = Date.now();
  let previousAt = startedAt;

  return (label: string, extra?: Record<string, unknown>) => {
    if (!enabled) return;

    const now = Date.now();
    console.log(`[StoryCreateTiming] storage:${label}`, {
      key,
      stepMs: now - previousAt,
      totalMs: now - startedAt,
      ...extra,
    });
    previousAt = now;
  };
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
  responseTimeoutAfterUploadMs = 0,
) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;
    let responseTimeout: ReturnType<typeof setTimeout> | undefined;

    const clearResponseTimeout = () => {
      if (responseTimeout) {
        clearTimeout(responseTimeout);
        responseTimeout = undefined;
      }
    };

    const complete = () => {
      if (settled) return;
      settled = true;
      clearResponseTimeout();
      resolve();
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearResponseTimeout();
      reject(error);
    };

    request.timeout = timeoutMs;
    request.open("PUT", url, true);
    request.setRequestHeader("Content-Type", contentType);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const progress = Math.min(1, Math.max(0, event.loaded / event.total));
        onProgress?.(progress);

        if (progress >= 1 && responseTimeoutAfterUploadMs > 0 && !responseTimeout) {
          responseTimeout = setTimeout(() => {
            request.abort();
            fail(new Error("File upload response timed out."));
          }, responseTimeoutAfterUploadMs);
        }
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        complete();
        return;
      }

      fail(new Error("Unable to upload file."));
    };
    request.onerror = () => fail(new Error("Unable to upload file."));
    request.ontimeout = () => fail(new Error("File upload timed out."));
    request.onabort = () => fail(new Error("File upload was aborted."));
    request.send(blob);
  });

const isLocalFileUri = (uri: string) => uri.toLowerCase().startsWith("file://");

const createNativeFileUpload = (
  url: string,
  uri: string,
  contentType: string,
  timeoutMs: number,
  onProgress?: (progress: number) => void,
): { completion: Promise<void>; cancel: () => Promise<void> } => {
  let task: FileSystem.UploadTask | null = null;
  let latestProgress = -1;
  let latestProgressAt = 0;
  const completion = new Promise<void>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const complete = () => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve();
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      reject(error);
    };

    task = FileSystem.createUploadTask(
      url,
      uri,
      {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
        headers: {
          "Content-Type": contentType,
        },
      },
      (event) => {
        if (event.totalBytesExpectedToSend > 0) {
          const progress = Math.min(1, Math.max(0, event.totalBytesSent / event.totalBytesExpectedToSend));
          const progressPercent = Math.floor(progress * 100);
          const now = Date.now();

          if (progressPercent >= latestProgress + 5 || progress >= 1 || now - latestProgressAt >= 500) {
            latestProgress = progressPercent;
            latestProgressAt = now;
            onProgress?.(progress);
          }
        }
      },
    );

    timeout = setTimeout(() => {
      void task?.cancelAsync().catch(() => undefined);
      fail(new Error("File upload timed out."));
    }, timeoutMs);

    task.uploadAsync()
      .then((result) => {
        if (!result) {
          fail(new Error("File upload was aborted."));
          return;
        }

        if (result.status >= 200 && result.status < 300) {
          onProgress?.(1);
          complete();
          return;
        }

        fail(new Error("Unable to upload file."));
      })
      .catch((error) => {
        fail(error instanceof Error ? error : new Error("Unable to upload file."));
      });
  });
  const cancel = async () => {
    await task?.cancelAsync();
  };

  return { completion, cancel };
};

const uploadLocalFileWithNativeTask = async (
  url: string,
  uri: string,
  contentType: string,
  timeoutMs: number,
  onProgress?: (progress: number) => void,
) => {
  const upload = createNativeFileUpload(url, uri, contentType, timeoutMs, onProgress);
  await upload.completion;
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

const getStorageUploadUrlFromApi = async (key: string, contentType: string, expiresIn: number) => {
  const response = await api.post("/storage/upload-url", {
    key,
    contentType,
    expiresIn,
  });
  const uploadUrl = response.data?.data?.url as string | undefined;

  if (!uploadUrl) {
    throw new Error("The upload URL response was incomplete.");
  }

  return uploadUrl;
};

export const canUseNativeVideoUpload = (uri: string, contentType: string) => (
  contentType.toLowerCase().startsWith("video/") && isLocalFileUri(uri)
);

export const startStorageFileUpload = async ({
  uri,
  key,
  contentType,
  onProgress,
  expiresIn,
}: StartStorageUploadPayload): Promise<StartedStorageUpload> => {
  const isVideo = contentType.toLowerCase().startsWith("video/");
  const directTimeoutMs = isVideo ? 30 * 60 * 1000 : 90 * 1000;
  const fallbackTimeoutMs = isVideo ? 30 * 60 * 1000 : 60 * 1000;
  const uploadUrl = await getStorageUploadUrlFromApi(key, contentType, expiresIn ?? (isVideo ? 60 * 30 : 60 * 5));

  if (!canUseNativeVideoUpload(uri, contentType)) {
    throw new Error("Native video upload requires a local file URI.");
  }

  const fallbackUrl = getStorageUploadUrl(key, contentType);
  const firstUrl = shouldUseApiUploadProxy(uploadUrl) ? fallbackUrl : uploadUrl;
  const firstContentType = firstUrl === fallbackUrl ? "application/octet-stream" : contentType;
  let activeUpload = createNativeFileUpload(firstUrl, uri, firstContentType, firstUrl === fallbackUrl ? fallbackTimeoutMs : directTimeoutMs, onProgress);

  const completion = activeUpload.completion
    .catch(async (error) => {
      if (firstUrl === fallbackUrl) {
        throw error;
      }

      activeUpload = createNativeFileUpload(fallbackUrl, uri, "application/octet-stream", fallbackTimeoutMs, onProgress);
      await activeUpload.completion;
    })
    .then(() => key);

  return {
    key,
    completion,
    cancel: async () => {
      await activeUpload.cancel();
    },
  };
};

export const uploadFileToStorage = async ({ uri, key, contentType, onProgress }: UploadFilePayload) => {
  const mark = createStorageTiming(key);
  const isVideo = contentType.toLowerCase().startsWith("video/");
  const isStoryMedia = key.startsWith("stories/");
  const directTimeoutMs = isVideo ? 30 * 60 * 1000 : isStoryMedia ? 20 * 1000 : 90 * 1000;
  const fallbackTimeoutMs = isVideo ? 30 * 60 * 1000 : 60 * 1000;
  const directResponseTimeoutAfterUploadMs = isVideo ? 30 * 1000 : isStoryMedia ? 5 * 1000 : 10 * 1000;
  const useNativeFileUpload = isVideo && isLocalFileUri(uri);

  mark("upload-url request start", { contentType });
  const uploadUrl = await getStorageUploadUrlFromApi(
    key,
    contentType,
    contentType.toLowerCase().startsWith("video/") ? 60 * 30 : 60 * 5,
  );
  mark("upload-url request complete");

  let blob: Blob | null = null;

  const uploadCurrentMedia = async (
    url: string,
    uploadContentType: string,
    timeoutMs: number,
    responseTimeoutAfterUploadMs = 0,
  ) => {
    if (useNativeFileUpload) {
      await uploadLocalFileWithNativeTask(url, uri, uploadContentType, timeoutMs, onProgress);
      return;
    }

    if (!blob) {
      mark("blob read start");
      blob = await getBlobFromUri(uri);
      mark("blob read complete", { bytes: blob.size });
    }

    if (onProgress) {
      await uploadBlobWithProgress(
        url,
        blob,
        uploadContentType,
        timeoutMs,
        onProgress,
        responseTimeoutAfterUploadMs,
      );
    } else {
      await uploadBlobWithFetch(url, blob, uploadContentType, timeoutMs);
    }
  };

  try {
    if (shouldUseApiUploadProxy(uploadUrl)) {
      throw new Error("Storage host is not reachable from this device.");
    }

    mark("direct upload start");
    await uploadCurrentMedia(uploadUrl, contentType, directTimeoutMs, directResponseTimeoutAfterUploadMs);
    mark("direct upload complete");
  } catch {
    const fallbackUrl = getStorageUploadUrl(key, contentType);
    mark("fallback upload start");
    await uploadCurrentMedia(fallbackUrl, "application/octet-stream", fallbackTimeoutMs);
    mark("fallback upload complete");
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
