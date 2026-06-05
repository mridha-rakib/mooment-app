import { create } from "zustand";
import { api } from "@/lib/api";
import {
  getCurrentLocationForSharing,
  watchCurrentLocationForSharing,
  type CurrentLocationPayload,
  type LocationSharingSubscription,
} from "@/lib/locationSharing";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

type LocationSharingState = {
  isWatching: boolean;
  isSyncing: boolean;
  error: string | null;
  enableSharing: () => Promise<void>;
  disableSharing: () => Promise<void>;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
  syncLocation: (location: CurrentLocationPayload) => Promise<void>;
};

let locationSubscription: LocationSharingSubscription | null = null;
let pendingLocationSubscription: Promise<LocationSharingSubscription> | null = null;
let sharingGeneration = 0;

const getUserFromResponse = (response: unknown): AuthUser => {
  const user = (response as { data?: { data?: { user?: AuthUser } } })?.data?.data?.user;

  if (!user) {
    throw new Error("The profile update response was incomplete.");
  }

  return user;
};

const persistSharedLocation = async (
  payload: {
    currentLocationSharingEnabled: boolean;
    currentLocation: CurrentLocationPayload | null;
  },
  expectedGeneration?: number,
) => {
  const response = await api.patch("/auth/me", payload);

  if (expectedGeneration !== undefined && expectedGeneration !== sharingGeneration) {
    return;
  }

  await useAuthStore.getState().setUser(getUserFromResponse(response));
};

const removeLocationSubscription = () => {
  locationSubscription?.remove();
  locationSubscription = null;
};

export const useLocationSharingStore = create<LocationSharingState>((set, get) => ({
  isWatching: false,
  isSyncing: false,
  error: null,

  enableSharing: async () => {
    const generation = sharingGeneration + 1;
    sharingGeneration = generation;
    set({ error: null, isSyncing: true });

    try {
      const currentLocation = await getCurrentLocationForSharing();
      await persistSharedLocation(
        {
          currentLocationSharingEnabled: true,
          currentLocation,
        },
        generation,
      );
      set({ error: null, isSyncing: false });
      await get().startWatching();
    } catch (error) {
      if (generation === sharingGeneration) {
        set({
          error: error instanceof Error ? error.message : "Unable to share your current location.",
          isSyncing: false,
        });
      }

      throw error;
    }
  },

  disableSharing: async () => {
    sharingGeneration += 1;
    removeLocationSubscription();
    set({ error: null, isSyncing: true, isWatching: false });

    try {
      await persistSharedLocation({
        currentLocationSharingEnabled: false,
        currentLocation: null,
      });
      set({ error: null, isSyncing: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unable to stop sharing your current location.",
        isSyncing: false,
      });
      throw error;
    }
  },

  startWatching: async () => {
    const user = useAuthStore.getState().user;

    if (!user?.currentLocationSharingEnabled) {
      return;
    }

    if (locationSubscription) {
      set({ isWatching: true });
      return;
    }

    if (pendingLocationSubscription) {
      await pendingLocationSubscription;
      set({ isWatching: Boolean(locationSubscription) });
      return;
    }

    const generation = sharingGeneration;
    set({ error: null });

    try {
      const subscriptionPromise = watchCurrentLocationForSharing((location) => {
        if (generation !== sharingGeneration) {
          return;
        }

        void get().syncLocation(location).catch(() => undefined);
      });
      pendingLocationSubscription = subscriptionPromise;
      const subscription = await subscriptionPromise;

      if (generation !== sharingGeneration || !useAuthStore.getState().user?.currentLocationSharingEnabled) {
        subscription.remove();
        return;
      }

      locationSubscription = subscription;
      set({ error: null, isWatching: true });
      void getCurrentLocationForSharing()
        .then((location) => get().syncLocation(location))
        .catch(() => undefined);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unable to track your current location.",
        isWatching: false,
      });
      throw error;
    } finally {
      pendingLocationSubscription = null;
    }
  },

  stopWatching: () => {
    removeLocationSubscription();
    set({ isWatching: false });
  },

  syncLocation: async (location) => {
    const generation = sharingGeneration;
    const user = useAuthStore.getState().user;

    if (!user?.currentLocationSharingEnabled) {
      return;
    }

    set({ isSyncing: true });

    try {
      await persistSharedLocation(
        {
          currentLocationSharingEnabled: true,
          currentLocation: location,
        },
        generation,
      );

      if (generation === sharingGeneration) {
        set({ error: null, isSyncing: false });
      }
    } catch (error) {
      if (generation === sharingGeneration) {
        set({
          error: error instanceof Error ? error.message : "Unable to update your live location.",
          isSyncing: false,
        });
      }

      throw error;
    }
  },
}));
