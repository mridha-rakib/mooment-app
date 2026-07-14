import { Alert } from "react-native";
import { useSyncExternalStore } from "react";

import { createMoment, type CreateMomentPayload, type Moment, type MomentMediaSource } from "@/lib/moments";
import { canUseNativeVideoUpload, startStorageFileUpload } from "@/lib/storage";

type PendingUploadStatus = "uploading" | "creating" | "succeeded" | "failed";

export type PendingVideoMomentUpload = {
  id: string;
  status: PendingUploadStatus;
  createdAt: number;
  moment?: Moment;
};

type PendingVideoMomentUploadInput = {
  uri: string;
  source: MomentMediaSource;
  contentType: string;
  durationSeconds?: number | null;
  payload: Omit<CreateMomentPayload, "mediaItems">;
};

type PendingOperation = PendingVideoMomentUpload & {
  cancel?: () => Promise<void>;
};

const listeners = new Set<() => void>();
let operations: PendingOperation[] = [];
const activeOperationIds = new Set<string>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setOperations = (nextOperations: PendingOperation[]) => {
  operations = nextOperations;
  notify();
};

const updateOperation = (id: string, patch: Partial<PendingOperation>) => {
  setOperations(operations.map((operation) => (
    operation.id === id ? { ...operation, ...patch } : operation
  )));
};

const removeOperation = (id: string) => {
  activeOperationIds.delete(id);
  setOperations(operations.filter((operation) => operation.id !== id));
};

const createPendingSubmissionId = () => `pending-video-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getVideoExtension = (contentType: string) => {
  const normalizedContentType = contentType.toLowerCase();

  if (normalizedContentType === "video/quicktime") return "mov";
  if (normalizedContentType === "video/webm") return "webm";
  if (normalizedContentType === "video/3gpp") return "3gp";
  if (normalizedContentType === "video/x-m4v") return "m4v";
  if (normalizedContentType.startsWith("video/")) {
    return normalizedContentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "video";
  }

  return "mp4";
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => operations;

export const usePendingVideoMomentUploads = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const startPendingVideoMomentUpload = async ({
  uri,
  source,
  contentType,
  durationSeconds,
  payload,
}: PendingVideoMomentUploadInput): Promise<string> => {
  if (!canUseNativeVideoUpload(uri, contentType)) {
    throw new Error("This video cannot be uploaded in the background path.");
  }

  const id = createPendingSubmissionId();
  const storageKey = `moments/video/${id}.${getVideoExtension(contentType)}`;

  if (activeOperationIds.has(id)) {
    throw new Error("This video is already being published.");
  }

  activeOperationIds.add(id);
  setOperations([{ id, status: "uploading", createdAt: Date.now() }, ...operations]);

  try {
    const upload = await startStorageFileUpload({
      uri,
      key: storageKey,
      contentType,
      expiresIn: 60 * 30,
    });

    updateOperation(id, { cancel: upload.cancel });

    void upload.completion
      .then(async (uploadedStorageKey) => {
        updateOperation(id, { status: "creating" });
        const moment = await createMoment({
          ...payload,
          mediaItems: [{
            type: "video",
            source,
            storageKey: uploadedStorageKey,
            contentType,
            durationSeconds: durationSeconds != null && Number.isFinite(durationSeconds)
              ? Math.max(0, durationSeconds)
              : null,
          }],
        });

        updateOperation(id, { status: "succeeded", moment, cancel: undefined });
      })
      .catch((error) => {
        removeOperation(id);
        Alert.alert(
          "Unable to create moment",
          error instanceof Error ? "Please check your connection and try again." : "Please check the moment details and try again.",
        );
      });

    return id;
  } catch (error) {
    removeOperation(id);
    throw error;
  }
};

export const acknowledgePendingVideoMomentUpload = (id: string) => {
  removeOperation(id);
};

export const cancelPendingVideoMomentUploads = async () => {
  const cancellableOperations = operations;
  setOperations([]);
  activeOperationIds.clear();

  await Promise.allSettled(cancellableOperations.map((operation) => operation.cancel?.()));
};
