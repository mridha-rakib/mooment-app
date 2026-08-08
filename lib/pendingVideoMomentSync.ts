import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getMoment, type Moment } from "@/lib/moments";

// Bounded backoff: starts fast (the worker often finishes within a few
// seconds) and eases off for longer-running jobs, capped so a single pending
// video never triggers rapid/continuous polling.
const POLL_DELAYS_MS = [3000, 4000, 6000, 9000, 12000, 15000];
// A genuinely still-processing response (queued/processing) is never treated
// as a failure and keeps polling indefinitely at the capped interval — this
// only bounds consecutive *request* failures (network/server errors), so a
// permanently broken request path resolves to the existing failed state
// instead of polling forever.
const MAX_CONSECUTIVE_REQUEST_ERRORS = 5;

export type VideoMomentSyncOutcome =
  | { type: "ready" | "failed"; moment: Moment }
  | { type: "not_found" }
  | { type: "error_exhausted" };

const getResponseStatus = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const status = (error as { response?: { status?: unknown } }).response?.status;

  return typeof status === "number" ? status : null;
};

/**
 * Targeted status sync for Feed video Moments still stuck at `queued` /
 * `processing`. Polls only the given ids (never the whole Feed), one
 * in-flight request per id, with bounded backoff, pausing while the app is
 * backgrounded and resuming immediately on foreground.
 */
export const usePendingVideoMomentSync = (
  unresolvedMomentIds: string[],
  onResolved: (momentId: string, outcome: VideoMomentSyncOutcome) => void,
) => {
  const trackedIdsRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlightRef = useRef(new Set<string>());
  const attemptRef = useRef(new Map<string, number>());
  const errorCountRef = useRef(new Map<string, number>());
  const requestSeqRef = useRef(new Map<string, number>());
  const enabledRef = useRef(AppState.currentState === "active");
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  const clearTimer = (id: string) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  const stopTracking = (id: string) => {
    trackedIdsRef.current.delete(id);
    clearTimer(id);
    attemptRef.current.delete(id);
    errorCountRef.current.delete(id);
    requestSeqRef.current.delete(id);
  };

  const scheduleNext = (id: string) => {
    if (!enabledRef.current || !trackedIdsRef.current.has(id)) {
      return;
    }

    clearTimer(id);
    const attempt = attemptRef.current.get(id) ?? 0;
    const delay = POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)];

    timersRef.current.set(id, setTimeout(() => {
      void poll(id);
    }, delay));
  };

  const poll = async (id: string) => {
    if (!enabledRef.current || !trackedIdsRef.current.has(id) || inFlightRef.current.has(id)) {
      return;
    }

    inFlightRef.current.add(id);
    const seq = (requestSeqRef.current.get(id) ?? 0) + 1;
    requestSeqRef.current.set(id, seq);

    try {
      const moment = await getMoment(id);

      inFlightRef.current.delete(id);

      // A newer request for this id (or removal from tracking) superseded
      // this response — never let a stale response overwrite fresher state.
      if (!trackedIdsRef.current.has(id) || requestSeqRef.current.get(id) !== seq) {
        return;
      }

      errorCountRef.current.delete(id);
      const videoStatus = moment.mediaItems.find((item) => item.type === "video")?.processingStatus;

      if (videoStatus === "ready" || videoStatus === "failed") {
        stopTracking(id);
        onResolvedRef.current(id, { type: videoStatus, moment });
        return;
      }

      attemptRef.current.set(id, (attemptRef.current.get(id) ?? 0) + 1);
      scheduleNext(id);
    } catch (error) {
      inFlightRef.current.delete(id);

      if (!trackedIdsRef.current.has(id) || requestSeqRef.current.get(id) !== seq) {
        return;
      }

      if (getResponseStatus(error) === 404) {
        stopTracking(id);
        onResolvedRef.current(id, { type: "not_found" });
        return;
      }

      const errorCount = (errorCountRef.current.get(id) ?? 0) + 1;
      errorCountRef.current.set(id, errorCount);

      if (errorCount >= MAX_CONSECUTIVE_REQUEST_ERRORS) {
        stopTracking(id);
        onResolvedRef.current(id, { type: "error_exhausted" });
        return;
      }

      attemptRef.current.set(id, (attemptRef.current.get(id) ?? 0) + 1);
      scheduleNext(id);
    }
  };

  const ensureTracking = (id: string) => {
    if (trackedIdsRef.current.has(id)) {
      return;
    }

    trackedIdsRef.current.add(id);
    attemptRef.current.set(id, 0);

    if (enabledRef.current) {
      void poll(id);
    }
  };

  useEffect(() => {
    const nextIds = new Set(unresolvedMomentIds);

    trackedIdsRef.current.forEach((id) => {
      if (!nextIds.has(id)) {
        stopTracking(id);
      }
    });

    nextIds.forEach((id) => ensureTracking(id));
    // unresolvedMomentIds is a plain string array recomputed by the caller;
    // ensureTracking/stopTracking are id-keyed and idempotent, so re-running
    // this reconciliation on every array identity change is inexpensive and
    // never starts a duplicate poll for an id already tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unresolvedMomentIds]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const wasEnabled = enabledRef.current;
      enabledRef.current = nextState === "active";

      if (!enabledRef.current) {
        timersRef.current.forEach((timer) => clearTimeout(timer));
        timersRef.current.clear();
        return;
      }

      if (!wasEnabled) {
        trackedIdsRef.current.forEach((id) => {
          if (!inFlightRef.current.has(id)) {
            void poll(id);
          }
        });
      }
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    trackedIdsRef.current.clear();
  }, []);
};
