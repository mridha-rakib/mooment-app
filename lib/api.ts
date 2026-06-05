import { create, isAxiosError } from "axios";
import Constants from "expo-constants";

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

const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined);
const isNgrokUrl = baseURL?.includes(".ngrok-free.") ?? false;

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
    ...(isNgrokUrl ? { "ngrok-skip-browser-warning": "true" } : {}),
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
