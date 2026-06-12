import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";
import { api, configureApiAuth } from "@/lib/api";
import { getAuthErrorDetails, getAuthErrorMessage } from "@/lib/authErrors";

const AUTH_TOKEN_KEY = "xenog.mobile.accessToken";
const AUTH_REFRESH_TOKEN_KEY = "xenog.mobile.refreshToken";
const AUTH_USER_KEY = "xenog.mobile.user";
const PENDING_VERIFICATION_EMAIL_KEY = "xenog.mobile.pendingVerificationEmail";

export type AuthUser = {
  id: string;
  name: string;
  username?: string;
  email: string;
  accountType: "personal" | "business";
  avatarKey?: string | null;
  gender?: string | null;
  age?: number | null;
  bio?: string | null;
  address?: string | null;
  businessDocumentKey?: string | null;
  currentLocationSharingEnabled?: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    updatedAt?: string;
  } | null;
  notificationsEnabled?: boolean;
  role: "user" | "admin";
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
  accountType: "personal" | "business";
};

type VerifyEmailPayload = {
  email: string;
  code: string;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UpdateProfilePayload = {
  name?: string;
  username?: string;
  email?: string;
  accountType?: "personal" | "business";
  avatarKey?: string | null;
  gender?: string | null;
  age?: number | null;
  bio?: string | null;
  address?: string | null;
  businessDocumentKey?: string | null;
  currentLocationSharingEnabled?: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null;
  notificationsEnabled?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingVerificationEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  hasRestored: boolean;
  error: string | null;
  authErrorCode: string | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<string>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<AuthUser>;
  resendVerificationCode: (email?: string) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => Promise<void>;
  setToken: (accessToken: string | null) => Promise<void>;
  setPendingVerificationEmail: (email: string | null) => Promise<void>;
  refreshAuthSession: () => Promise<AuthUser>;
  restoreAuthSession: (force?: boolean) => Promise<AuthUser | null>;
  clearAuthState: () => Promise<void>;
};

const canUseWebStorage = () => Platform.OS === "web" && typeof localStorage !== "undefined";

const canUseSecureStore = async () => Platform.OS !== "web" && (await SecureStore.isAvailableAsync());

const readStoredValue = async (key: string) => {
  try {
    if (await canUseSecureStore()) {
      return SecureStore.getItemAsync(key);
    }

    if (canUseWebStorage()) {
      return localStorage.getItem(key);
    }
  } catch {
    return null;
  }

  return null;
};

const writeStoredValue = async (key: string, value: string) => {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  if (canUseWebStorage()) {
    localStorage.setItem(key, value);
  }
};

const deleteStoredValue = async (key: string) => {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  if (canUseWebStorage()) {
    localStorage.removeItem(key);
  }
};

const readStoredUser = async () => {
  const storedUser = await readStoredValue(AUTH_USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    await deleteStoredValue(AUTH_USER_KEY);
    return null;
  }
};

const persistAuthState = async (user: AuthUser, tokens: AuthTokens) => {
  await Promise.all([
    writeStoredValue(AUTH_TOKEN_KEY, tokens.accessToken),
    writeStoredValue(AUTH_REFRESH_TOKEN_KEY, tokens.refreshToken),
    writeStoredValue(AUTH_USER_KEY, JSON.stringify(user)),
  ]);
};

const persistRestoredAuthState = async (
  user: AuthUser,
  accessToken: string | null,
  refreshToken: string | null,
) => {
  const storageUpdates: Promise<void>[] = [writeStoredValue(AUTH_USER_KEY, JSON.stringify(user))];

  storageUpdates.push(accessToken ? writeStoredValue(AUTH_TOKEN_KEY, accessToken) : deleteStoredValue(AUTH_TOKEN_KEY));
  storageUpdates.push(
    refreshToken ? writeStoredValue(AUTH_REFRESH_TOKEN_KEY, refreshToken) : deleteStoredValue(AUTH_REFRESH_TOKEN_KEY),
  );

  await Promise.all(storageUpdates);
};

const clearStoredAuthState = async () => {
  await Promise.all([
    deleteStoredValue(AUTH_TOKEN_KEY),
    deleteStoredValue(AUTH_REFRESH_TOKEN_KEY),
    deleteStoredValue(AUTH_USER_KEY),
  ]);
};

const setStoredPendingVerificationEmail = async (email: string | null) => {
  if (email) {
    await writeStoredValue(PENDING_VERIFICATION_EMAIL_KEY, email);
    return;
  }

  await deleteStoredValue(PENDING_VERIFICATION_EMAIL_KEY);
};

const getSessionPayload = (response: unknown) => {
  const data = (response as {
    data?: {
      data?: {
        user?: AuthUser;
        tokens?: { accessToken?: string; refreshToken?: string };
        accessToken?: string;
        refreshToken?: string;
      };
    };
  })
    ?.data?.data;

  return {
    user: data?.user ?? null,
    accessToken: data?.tokens?.accessToken ?? data?.accessToken ?? null,
    refreshToken: data?.tokens?.refreshToken ?? data?.refreshToken ?? null,
  };
};

const normalizeRegistrationUsername = (username: string) => username.trim().replace(/^@+/, "").toLowerCase();
const normalizeRegistrationEmail = (email: string) => email.trim().toLowerCase();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  pendingVerificationEmail: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true,
  hasRestored: false,
  error: null,
  authErrorCode: null,

  login: async ({ email, password }) => {
    set({ isLoading: true, error: null, authErrorCode: null });

    try {
      const response = await api.post("/auth/login", { email, password }, {
        skipAuthHeader: true,
        skipAuthRedirect: true,
        skipAuthRefresh: true,
      });
      const { user, accessToken, refreshToken } = getSessionPayload(response);

      if (!user || !accessToken || !refreshToken) {
        throw new Error("The sign in response was incomplete.");
      }

      await persistAuthState(user, { accessToken, refreshToken });
      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        hasRestored: true,
        error: null,
      });

      return user;
    } catch (error) {
      const message = getAuthErrorMessage(error, "Unable to sign in. Check your credentials and try again.");
      const details = getAuthErrorDetails(error);
      const pendingEmail = details?.code === "EMAIL_NOT_VERIFIED" ? details.email ?? email.trim() : null;

      if (pendingEmail) {
        await setStoredPendingVerificationEmail(pendingEmail);
      }

      set({
        isLoading: false,
        error: message,
        authErrorCode: details?.code ?? null,
        pendingVerificationEmail: pendingEmail ?? get().pendingVerificationEmail,
      });
      throw new Error(message);
    }
  },

  register: async ({ name, username, email, password, accountType }) => {
    set({ isLoading: true, error: null, authErrorCode: null });

    try {
      const normalizedEmail = normalizeRegistrationEmail(email);
      const normalizedUsername = normalizeRegistrationUsername(username);
      const response = await api.post(
        "/auth/register",
        {
          name: name.trim(),
          username: normalizedUsername,
          email: normalizedEmail,
          password,
          accountType,
        },
        {
          skipAuthHeader: true,
          skipAuthRedirect: true,
          skipAuthRefresh: true,
        },
      );
      const pendingEmail = response.data?.data?.email ?? normalizedEmail;

      await setStoredPendingVerificationEmail(pendingEmail);
      set({
        pendingVerificationEmail: pendingEmail,
        isLoading: false,
        error: null,
        authErrorCode: null,
      });

      return pendingEmail;
    } catch (error) {
      const message = getAuthErrorMessage(error, "Unable to create your account. Please try again.");
      set({ isLoading: false, error: message, authErrorCode: null });
      throw new Error(message);
    }
  },

  verifyEmail: async ({ email, code }) => {
    set({ isLoading: true, error: null, authErrorCode: null });

    try {
      const response = await api.post(
        "/auth/verify-email",
        {
          email: email.trim(),
          code: code.trim(),
        },
        {
          skipAuthHeader: true,
          skipAuthRedirect: true,
          skipAuthRefresh: true,
        },
      );
      const { user, accessToken, refreshToken } = getSessionPayload(response);

      if (!user || !accessToken || !refreshToken) {
        throw new Error("The verification response was incomplete.");
      }

      await persistAuthState(user, { accessToken, refreshToken });
      await setStoredPendingVerificationEmail(null);
      set({
        user,
        accessToken,
        refreshToken,
        pendingVerificationEmail: null,
        isAuthenticated: true,
        isLoading: false,
        isRestoring: false,
        hasRestored: true,
        error: null,
        authErrorCode: null,
      });

      return user;
    } catch (error) {
      const message = getAuthErrorMessage(error, "Unable to verify your email. Please check the code and try again.");
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  resendVerificationCode: async (email) => {
    const verificationEmail = email ?? get().pendingVerificationEmail;

    if (!verificationEmail) {
      const message = "Enter your email address before requesting a new code.";
      set({ error: message, authErrorCode: null });
      throw new Error(message);
    }

    set({ isLoading: true, error: null, authErrorCode: null });

    try {
      await api.post("/auth/resend-verification", { email: verificationEmail }, {
        skipAuthHeader: true,
        skipAuthRedirect: true,
        skipAuthRefresh: true,
      });
      await setStoredPendingVerificationEmail(verificationEmail);
      set({
        pendingVerificationEmail: verificationEmail,
        isLoading: false,
        error: null,
        authErrorCode: null,
      });
    } catch (error) {
      const message = getAuthErrorMessage(error, "Unable to resend the verification code. Please try again.");
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  updateProfile: async (payload) => {
    set({ isLoading: true, error: null, authErrorCode: null });

    try {
      const response = await api.patch("/auth/me", payload);
      const user = (response.data?.data?.user ?? null) as AuthUser | null;

      if (!user) {
        throw new Error("The profile update response was incomplete.");
      }

      await writeStoredValue(AUTH_USER_KEY, JSON.stringify(user));
      set({
        user,
        isLoading: false,
        error: null,
        authErrorCode: null,
        isAuthenticated: Boolean(get().accessToken),
      });

      return user;
    } catch (error) {
      const message = getAuthErrorMessage(error, "Unable to save profile. Please try again.");
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      if (get().accessToken) {
        await api.post("/auth/logout", null, {
          skipAuthRedirect: true,
          skipAuthRefresh: true,
        });
      }
    } catch {
      // The local session should still be cleared when the server is unavailable.
    } finally {
      await setStoredPendingVerificationEmail(null);
      await get().clearAuthState();
      set({ pendingVerificationEmail: null, isLoading: false, isRestoring: false, hasRestored: true });
    }
  },

  setUser: async (user) => {
    if (user) {
      await writeStoredValue(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      await deleteStoredValue(AUTH_USER_KEY);
    }

    set({ user, isAuthenticated: Boolean(user && get().accessToken) });
  },

  setToken: async (accessToken) => {
    if (accessToken) {
      await writeStoredValue(AUTH_TOKEN_KEY, accessToken);
    } else {
      await deleteStoredValue(AUTH_TOKEN_KEY);
    }

    set({ accessToken, isAuthenticated: Boolean(accessToken && get().user) });
  },

  setPendingVerificationEmail: async (email) => {
    await setStoredPendingVerificationEmail(email);
    set({ pendingVerificationEmail: email, authErrorCode: null });
  },

  refreshAuthSession: async () => {
    const storedRefreshToken = get().refreshToken ?? (await readStoredValue(AUTH_REFRESH_TOKEN_KEY));

    if (!storedRefreshToken) {
      throw new Error("Missing refresh token.");
    }

    const response = await api.post(
      "/auth/refresh",
      { refreshToken: storedRefreshToken },
      {
        skipAuthHeader: true,
        skipAuthRedirect: true,
        skipAuthRefresh: true,
      },
    );
    const { user, accessToken, refreshToken } = getSessionPayload(response);

    if (!user || !accessToken || !refreshToken) {
      throw new Error("The refreshed session response was incomplete.");
    }

    await persistAuthState(user, { accessToken, refreshToken });
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isRestoring: false,
      hasRestored: true,
      error: null,
      authErrorCode: null,
    });

    return user;
  },

  restoreAuthSession: async (force = false) => {
    if (get().hasRestored && !force) {
      return get().user;
    }

    set({ isRestoring: true, error: null, authErrorCode: null });
    const [accessToken, refreshToken, pendingVerificationEmail, storedUser] = await Promise.all([
      readStoredValue(AUTH_TOKEN_KEY),
      readStoredValue(AUTH_REFRESH_TOKEN_KEY),
      readStoredValue(PENDING_VERIFICATION_EMAIL_KEY),
      readStoredUser(),
    ]);

    if (!accessToken && !refreshToken) {
      await get().clearAuthState();
      set({ pendingVerificationEmail, isRestoring: false, hasRestored: true });
      return null;
    }

    set({
      accessToken,
      refreshToken,
      pendingVerificationEmail,
      user: storedUser,
      isAuthenticated: Boolean(storedUser && (accessToken || refreshToken)),
    });

    if (!accessToken) {
      try {
        return await get().refreshAuthSession();
      } catch (error) {
        const message = getAuthErrorMessage(error, "Your session expired. Please sign in again.");
        await get().clearAuthState();
        set({ pendingVerificationEmail, isRestoring: false, hasRestored: true, error: message });
        return null;
      }
    }

    try {
      const response = await api.get("/auth/me", { skipAuthRedirect: true });
      const user = (response.data?.data?.user ?? null) as AuthUser | null;

      if (!user) {
        throw new Error("The restored session did not include a user.");
      }

      const currentAccessToken = get().accessToken ?? accessToken;
      const currentRefreshToken = get().refreshToken ?? refreshToken;

      await persistRestoredAuthState(user, currentAccessToken, currentRefreshToken);
      set({
        user,
        accessToken: currentAccessToken,
        refreshToken: currentRefreshToken,
        isAuthenticated: Boolean(currentAccessToken),
        isRestoring: false,
        hasRestored: true,
        error: null,
        authErrorCode: null,
      });

      return user;
    } catch (error) {
      const message = getAuthErrorMessage(error, "Your session expired. Please sign in again.");
      await get().clearAuthState();
      set({ pendingVerificationEmail, isRestoring: false, hasRestored: true, error: message });
      return null;
    }
  },

  clearAuthState: async () => {
    await clearStoredAuthState();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
      authErrorCode: null,
    });
  },
}));

configureApiAuth({
  getToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: () => {
    void useAuthStore.getState().clearAuthState();
  },
  onRefreshToken: async () => {
    await useAuthStore.getState().refreshAuthSession();
  },
});
