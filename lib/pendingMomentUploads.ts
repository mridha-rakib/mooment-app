import { Alert } from "react-native";
import { useSyncExternalStore } from "react";

import { createMoment, type CreateMomentPayload, type Moment, type MomentMediaSource } from "@/lib/moments";
import { canUseNativeVideoUpload, startMomentVideoFileUpload } from "@/lib/storage";

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

const createPendingTiming = (id: string) => {
  const enabled = __DEV__;
  const startedAt = Date.now();
  let previousAt = startedAt;

  return (phase: string, extra?: Record<string, unknown>) => {
    if (!enabled) return;

    const now = Date.now();
    console.log("[MomentVideoUploadTiming] pending-state", {
      id,
      phase,
      stepMs: now - previousAt,
      totalMs: now - startedAt,
      ...extra,
    });
    previousAt = now;
  };
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => operations;

export const usePendingVideoMomentUploads = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

const getPendingUploadErrorMessage = (error: unknown) => {
  const responseMessage = typeof error === "object" && error !== null
    ? (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
    : null;

  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  return "Please check your connection and try again.";
};

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
  const mark = createPendingTiming(id);

  if (activeOperationIds.has(id)) {
    throw new Error("This video is already being published.");
  }

  activeOperationIds.add(id);
  setOperations([{ id, status: "uploading", createdAt: Date.now() }, ...operations]);
  mark("upload operation created", { contentType });

  try {
    const upload = await startMomentVideoFileUpload({
      uri,
      contentType,
    });

    updateOperation(id, { cancel: upload.cancel });

    void upload.completion
      .then(async (uploadedStorageKey) => {
        mark("upload completion resolved");
        updateOperation(id, { status: "creating" });
        mark("moment creation request start");
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

        mark("moment creation request complete", { momentId: moment.id });
        updateOperation(id, { status: "succeeded", moment, cancel: undefined });
      })
      .catch((error) => {
        mark("operation failed", {
          message: getPendingUploadErrorMessage(error),
          status: typeof error === "object" && error !== null
            ? (error as { response?: { status?: unknown } }).response?.status ?? null
            : null,
        });
        removeOperation(id);
        Alert.alert(
          "Unable to create moment",
          getPendingUploadErrorMessage(error),
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
