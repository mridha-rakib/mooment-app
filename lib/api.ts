import { create, isAxiosError } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

declare module "axios" {
  export interface AxiosRequestConfig {
    _authRetry?: boolean;
    skipAuthHeader?: boolean;
    skipAuthRedirect?: boolean;
    skipAuthRefresh?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    _authRetry?: boolean;
    skipAuthHeader?: boolean;
    skipAuthRedirect?: boolean;
    skipAuthRefresh?: boolean;
  }
}

type ExpoConstantsWithDevHost = typeof Constants & {
  expoConfig?: {
    extra?: Record<string, unknown>;
    hostUri?: string;
  };
  manifest?: {
    debuggerHost?: string;
    hostUri?: string;
  };
  manifest2?: {
    extra?: {
      expoClient?: {
        hostUri?: string;
      };
    };
  };
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

const getHostFromUri = (uri: string | undefined) => {
  if (!uri) {
    return null;
  }

  const normalizedUri = uri.includes("://") ? uri : `http://${uri}`;

  try {
    return new URL(normalizedUri).hostname;
  } catch {
    return null;
  }
};

const getExpoDevServerHost = () => {
  const constants = Constants as ExpoConstantsWithDevHost;
  const hostCandidates = [
    constants.expoConfig?.hostUri,
    constants.manifest2?.extra?.expoClient?.hostUri,
    constants.manifest?.debuggerHost,
    constants.manifest?.hostUri,
  ];

  for (const candidate of hostCandidates) {
    const host = getHostFromUri(candidate);

    if (host && !LOCAL_HOSTS.has(host)) {
      return host;
    }
  }

  return null;
};

const resolveApiBaseUrl = () => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.trim();

  if (!configuredUrl) {
    return undefined;
  }

  try {
    const url = new URL(configuredUrl);

    if (Platform.OS === "android" && LOCAL_HOSTS.has(url.hostname)) {
      const devServerHost = getExpoDevServerHost();

      // A LAN-hosted Expo session needs the computer's LAN address. When the
      // session itself uses localhost, keep localhost so `adb reverse` (set up
      // by the Android start/reload scripts) can carry API traffic to port 4000.
      // Replacing it with 10.0.2.2 breaks physical Android devices because that
      // alias exists only inside the Android emulator.
      if (devServerHost) {
        url.hostname = devServerHost;
      }
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return configuredUrl.replace(/\/$/, "");
  }
};

const baseURL = resolveApiBaseUrl();

const isNgrokUrl = (url: string | undefined) => {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).hostname.includes("ngrok-free");
  } catch {
    return url.includes("ngrok-free");
  }
};

let getAccessToken = () => null as string | null;
let handleUnauthorized = () => {};
let refreshAccessToken = async () => {};
let refreshTokenPromise: Promise<void> | null = null;

export const configureApiAuth = ({
  getToken,
  onUnauthorized,
  onRefreshToken,
}: {
  getToken: () => string | null;
  onUnauthorized: () => void;
  onRefreshToken: () => Promise<void>;
}) => {
  getAccessToken = getToken;
  handleUnauthorized = onUnauthorized;
  refreshAccessToken = onRefreshToken;
};

const refreshAuthToken = async () => {
  if (!refreshTokenPromise) {
    refreshTokenPromise = refreshAccessToken().finally(() => {
      refreshTokenPromise = null;
    });
  }

  return refreshTokenPromise;
};

export const api = create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    ...(isNgrokUrl(baseURL) ? { "ngrok-skip-browser-warning": "true" } : {}),
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (!baseURL) {
    return Promise.reject(new Error("Missing EXPO_PUBLIC_API_BASE_URL."));
  }

  const token = getAccessToken();

  if (token && !config.skipAuthHeader) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = isAxiosError(error) ? error.config : undefined;
    const skipAuthRedirect = originalRequest?.skipAuthRedirect;
    const skipAuthRefresh = originalRequest?.skipAuthRefresh;

    if (status === 401 && originalRequest && !skipAuthRefresh && !originalRequest._authRetry) {
      originalRequest._authRetry = true;

      try {
        await refreshAuthToken();
        const token = getAccessToken();

        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }

        return api(originalRequest);
      } catch {
        // Fall through to local sign-out handling below.
      }
    }

    if (status === 401 && !skipAuthRedirect) {
      handleUnauthorized();
    }

    return Promise.reject(error);
  },
);
