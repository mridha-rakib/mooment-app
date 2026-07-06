import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

const STORAGE_KEY = "xenog.mobile.ticketWalletShortcut";

type ShortcutPosition = {
  x: number;
  y: number;
};

type PersistedShortcutState = {
  isVisible?: boolean;
  position?: ShortcutPosition | null;
};

type TicketWalletShortcutState = {
  isHydrated: boolean;
  isVisible: boolean;
  position: ShortcutPosition | null;
  restore: () => Promise<void>;
  hide: () => Promise<void>;
  remove: () => Promise<void>;
  setPosition: (position: ShortcutPosition) => Promise<void>;
  hydrate: () => Promise<void>;
};

const canUseWebStorage = () => Platform.OS === "web" && typeof localStorage !== "undefined";

const canUseSecureStore = async () => Platform.OS !== "web" && (await SecureStore.isAvailableAsync());

const readStoredValue = async () => {
  try {
    if (await canUseSecureStore()) {
      return SecureStore.getItemAsync(STORAGE_KEY);
    }

    if (canUseWebStorage()) {
      return localStorage.getItem(STORAGE_KEY);
    }
  } catch {
    return null;
  }

  return null;
};

const writeStoredValue = async (state: PersistedShortcutState) => {
  try {
    const value = JSON.stringify(state);

    if (await canUseSecureStore()) {
      await SecureStore.setItemAsync(STORAGE_KEY, value);
      return;
    }

    if (canUseWebStorage()) {
      localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // Keep the in-memory shortcut state even if local persistence is unavailable.
  }
};

const readPersistedState = async (): Promise<PersistedShortcutState | null> => {
  const stored = await readStoredValue();

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as PersistedShortcutState;
    const position = parsed.position;

    return {
      isVisible: typeof parsed.isVisible === "boolean" ? parsed.isVisible : undefined,
      position:
        position && Number.isFinite(position.x) && Number.isFinite(position.y)
          ? { x: position.x, y: position.y }
          : null,
    };
  } catch {
    return null;
  }
};

export const useTicketWalletShortcutStore = create<TicketWalletShortcutState>((set, get) => ({
  isHydrated: false,
  isVisible: true,
  position: null,

  hydrate: async () => {
    if (get().isHydrated) {
      return;
    }

    const persisted = await readPersistedState();

    set({
      isHydrated: true,
      isVisible: persisted?.isVisible ?? true,
      position: persisted?.position ?? null,
    });
  },

  restore: async () => {
    const position = get().position;

    set({ isHydrated: true, isVisible: true });
    await writeStoredValue({ isVisible: true, position });
  },

  hide: async () => {
    const position = get().position;

    set({ isHydrated: true, isVisible: false });
    await writeStoredValue({ isVisible: false, position });
  },

  remove: async () => {
    set({ isHydrated: true, isVisible: false, position: null });
    await writeStoredValue({ isVisible: false, position: null });
  },

  setPosition: async (position) => {
    set({ isHydrated: true, position });
    await writeStoredValue({ isVisible: get().isVisible, position });
  },
}));
