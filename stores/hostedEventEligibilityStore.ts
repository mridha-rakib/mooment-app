import { create } from "zustand";

import { getMyProfileEvents, type ProfileEventGroups } from "@/lib/events";

export type HostedEventEligibilityStatus = "unknown" | "eligible" | "ineligible";

type HostedEventEligibilityState = {
  eligibilityStatus: HostedEventEligibilityStatus;
  hasActiveHostedEvent: boolean | null;
  isRefreshing: boolean;
  lastResolvedAt: number | null;
  setFromProfileEvents: (profileEvents: Pick<ProfileEventGroups, "active">) => HostedEventEligibilityStatus;
  refresh: () => Promise<HostedEventEligibilityStatus>;
  reset: () => void;
};

let activeRefresh: Promise<HostedEventEligibilityStatus> | null = null;
let refreshGeneration = 0;

export const deriveHostedEventEligibilityFromProfileEvents = (
  profileEvents: Pick<ProfileEventGroups, "active">,
): boolean => profileEvents.active.length > 0;

const getEligibilityStatus = (hasActiveHostedEvent: boolean): HostedEventEligibilityStatus =>
  hasActiveHostedEvent ? "eligible" : "ineligible";

export const useHostedEventEligibilityStore = create<HostedEventEligibilityState>((set, get) => ({
  eligibilityStatus: "unknown",
  hasActiveHostedEvent: null,
  isRefreshing: false,
  lastResolvedAt: null,

  setFromProfileEvents: (profileEvents) => {
    const hasActiveHostedEvent = deriveHostedEventEligibilityFromProfileEvents(profileEvents);
    const eligibilityStatus = getEligibilityStatus(hasActiveHostedEvent);

    set({
      eligibilityStatus,
      hasActiveHostedEvent,
      isRefreshing: false,
      lastResolvedAt: Date.now(),
    });

    return eligibilityStatus;
  },

  refresh: async () => {
    if (activeRefresh) {
      return activeRefresh;
    }

    const generation = ++refreshGeneration;

    set({ isRefreshing: true });

    activeRefresh = getMyProfileEvents()
      .then((profileEvents) => {
        if (generation !== refreshGeneration) {
          return get().eligibilityStatus;
        }

        return get().setFromProfileEvents(profileEvents);
      })
      .catch((error) => {
        if (generation === refreshGeneration) {
          set({
            eligibilityStatus: "unknown",
            hasActiveHostedEvent: null,
            isRefreshing: false,
          });
        }
        throw error;
      })
      .finally(() => {
        if (generation === refreshGeneration) {
          activeRefresh = null;
          set({ isRefreshing: false });
        }
      });

    return activeRefresh;
  },

  reset: () => {
    refreshGeneration += 1;
    activeRefresh = null;
    set({
      eligibilityStatus: "unknown",
      hasActiveHostedEvent: null,
      isRefreshing: false,
      lastResolvedAt: null,
    });
  },
}));

export const refreshHostedEventEligibility = async (): Promise<void> => {
  try {
    await useHostedEventEligibilityStore.getState().refresh();
  } catch {
    // Eligibility is a UX hint; scanner authorization remains backend-owned.
  }
};
