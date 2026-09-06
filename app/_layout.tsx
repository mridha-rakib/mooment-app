import TicketWalletShortcut from "@/components/ticket/TicketWalletShortcut";
import SuccessToastHost from "@/components/ui/SuccessToast";
import { useTheme } from "@/hooks/useTheme";
import { installLogBoxStackGuard } from "@/lib/installLogBoxStackGuard";
import { registerFcmToken } from "@/lib/notifications";
import { connect as connectRealtimeSocket, disconnect as disconnectRealtimeSocket } from "@/lib/socketClient";
import { readThemePreference } from "@/lib/themePreference";
import { setTheme } from "@/redux/slice/preference";
import { useAuthStore } from "@/stores/authStore";
import { useLocationSharingStore } from "@/stores/locationSharingStore";
import {
  OleoScript_400Regular,
  useFonts,
} from "@expo-google-fonts/oleo-script";
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as NavigationBar from "expo-navigation-bar";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider, useDispatch } from "react-redux";
import { store } from "../redux/store";

installLogBoxStackGuard();

// Keep the native splash up until the JS side has its *local* essentials
// ready (fonts + icon fonts). Without this the first frame rendered on a
// cold start has no icon glyphs loaded yet, which is what made the login
// checkbox checkmark and the Log In button spinner render as empty boxes
// only on a fresh launch. Awaited assets are all bundled/local — this is
// not gated on any network or remote data.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Bundled images that fill an entire above-the-fold screen on the very
// first routes (onboarding hero + JS splash logo). Preloaded so the cold
// first paint of onboarding isn't a black rectangle while the image
// streams in. Non-blocking — see BootSplashGate.
const CRITICAL_IMAGE_ASSETS = [
  require("../assets/images/splash.png"),
  require("../assets/images/Splash-logo.png"),
];

function AuthSessionGate() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const hasRestored = useAuthStore((state) => state.hasRestored);
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);
  const restoreAuthSession = useAuthStore((state) => state.restoreAuthSession);

  useEffect(() => {
    void restoreAuthSession();
  }, [restoreAuthSession]);

  // Authoritative logout reset: the moment a logout starts, tear down the
  // whole navigation stack and send the user to onboarding — regardless of
  // the current route. Without this, a protected route (e.g. a locked
  // event) can survive under an auth screen and be reopened afterwards.
  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (!isLoggingOut) return;

    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace("/auth-screen/onboarding" as any);
  }, [isLoggingOut, rootNavigationState, router]);

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (isRestoring || !hasRestored) return;
    if (isLoggingOut) return;

    const firstSegment = segments[0];
    const secondSegment = segments[1];
    const isAuthRoute = firstSegment === "auth-screen";
    const isPostVerificationRoute =
      secondSegment === "success-verified" ||
      secondSegment === "onboarding-settings";
    const isPublicRoute =
      !firstSegment || isAuthRoute || firstSegment === "error";

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/auth-screen/onboarding" as any);
      return;
    }

    if (isAuthenticated && isAuthRoute && !isPostVerificationRoute) {
      router.replace("/(tabs)/home" as any);
    }
  }, [
    hasRestored,
    isAuthenticated,
    isRestoring,
    isLoggingOut,
    rootNavigationState,
    router,
    segments,
  ]);

  return null;
}

function ThemePreferenceGate() {
  const dispatch = useDispatch();

  useEffect(() => {
    let isMounted = true;

    readThemePreference()
      .then((storedTheme) => {
        if (isMounted && storedTheme) {
          dispatch(setTheme(storedTheme));
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  return null;
}

function SystemNavigationBarGate() {
  const { isDark } = useTheme();

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    NavigationBar.setStyle(isDark ? "dark" : "light");
    void NavigationBar.setVisibilityAsync("visible");
  }, [isDark]);

  return null;
}

function LocationSharingGate() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRestored = useAuthStore((state) => state.hasRestored);
  const locationSharingEnabled = useAuthStore((state) =>
    Boolean(state.user?.currentLocationSharingEnabled),
  );
  const startWatching = useLocationSharingStore((state) => state.startWatching);
  const stopWatching = useLocationSharingStore((state) => state.stopWatching);
  const disableSharing = useLocationSharingStore(
    (state) => state.disableSharing,
  );

  useEffect(() => {
    if (!hasRestored) {
      return;
    }

    if (!isAuthenticated || !locationSharingEnabled) {
      stopWatching();
      return;
    }

    let isMounted = true;

    startWatching().catch(() => {
      if (isMounted) {
        void disableSharing().catch(() => undefined);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    disableSharing,
    hasRestored,
    isAuthenticated,
    locationSharingEnabled,
    startWatching,
    stopWatching,
  ]);

  return null;
}

function PushNotificationGate() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRestored = useAuthStore((state) => state.hasRestored);

  useEffect(() => {
    if (!isAuthenticated || !hasRestored) return;
    if (Platform.OS !== "android" && Platform.OS !== "ios") return;

    let tokenSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    const setup = async () => {
      try {
        const Notifications = await import("expo-notifications");

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("messages", {
            name: "Messages",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
            showBadge: true,
          });
        }

        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          if (__DEV__) console.log("[Push] Permission not granted");
          return;
        }

        const tokenData = await Notifications.getDevicePushTokenAsync();
        const token = tokenData.data as string;

        if (__DEV__)
          console.log(
            "[Push] FCM token exists:",
            Boolean(token),
            "platform:",
            Platform.OS,
          );

        const attemptRegister = async (
          fcmToken: string,
          attempt = 0,
        ): Promise<void> => {
          if (__DEV__)
            console.log(
              "[Push] Registration attempt",
              attempt + 1,
              "platform:",
              Platform.OS,
            );
          try {
            await registerFcmToken(fcmToken, Platform.OS);
            if (__DEV__) console.log("[Push] Registration success");
          } catch (e: unknown) {
            const httpStatus = (e as { response?: { status?: number } })
              ?.response?.status;
            if (__DEV__)
              console.log(
                "[Push] Registration failed, status:",
                httpStatus ?? "network error",
              );
            if (attempt < 2) {
              await new Promise<void>((resolve) =>
                setTimeout(resolve, 3000 * (attempt + 1)),
              );
              return attemptRegister(fcmToken, attempt + 1);
            }
          }
        };

        await attemptRegister(token);

        tokenSubscription = Notifications.addPushTokenListener((newToken) => {
          if (__DEV__)
            console.log(
              "[Push] FCM token refreshed, exists:",
              Boolean(newToken?.data),
              "platform:",
              Platform.OS,
            );
          void attemptRegister(newToken.data as string);
        });

        const navigateFromNotification = (
          data: Record<string, string> | undefined,
        ) => {
          if (!data) return;
          if (__DEV__) console.log("[Push] Notification tapped", data);
          if (data.type === "dm" && data.conversationPartnerId) {
            router.push({
              pathname: "/chat-screen/chat-detail",
              params: {
                id: data.conversationPartnerId,
                name: data.senderName ?? "Chat",
                ...(data.senderAvatar ? { avatar: data.senderAvatar } : {}),
              },
            } as any);
          } else if (data.type === "group" && data.groupId) {
            router.push({
              pathname: "/chat-screen/chat-detail",
              params: {
                id: data.groupId,
                name: data.groupName ?? "Group",
                isGroup: "true",
                ...(data.groupAvatar ? { avatar: data.groupAvatar } : {}),
              },
            } as any);
          } else if (
            (data.type === "moment_reaction" || data.type === "moment_comment" || data.type === "moment_share")
          ) {
            // contentType is authoritative for routing (never inferred from
            // type alone) — an Event's Interaction Moment shares these same
            // types with normal Post interactions, so momentId must never be
            // used to open an Event notification, and vice versa.
            if (data.contentType === "event" && data.eventId) {
              router.push({
                pathname: "/event-screen/event",
                params: { eventId: data.eventId },
              } as any);
            } else if (data.momentId) {
              router.push({
                pathname: "/post-screen/view-post",
                params: { postId: data.momentId },
              } as any);
            }
          }
        };

        // Handle tap when app is launched from a killed state
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          navigateFromNotification(
            lastResponse.notification.request.content.data as
              | Record<string, string>
              | undefined,
          );
        }

        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            navigateFromNotification(
              response.notification.request.content.data as
                | Record<string, string>
                | undefined,
            );
          });
      } catch (error) {
        if (__DEV__) console.log("[Push] Setup failed", error);
      }
    };

    void setup();

    return () => {
      tokenSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [isAuthenticated, hasRestored, router]);

  return null;
}

/**
 * Owns the single shared Socket.IO connection (app/lib/socketClient.ts) for
 * the whole authenticated session — chat, presence, and notifications.
 * Screens never call `connect`/`disconnect` themselves; they only
 * `subscribe(...)` to this already-connected socket. This replaces the
 * previous pattern of each screen opening its own realtime connection.
 *
 * The live-room/event-chat feature is intentionally NOT part of this —
 * it still uses `app/lib/realtime.ts` (raw WebSocket) directly per-screen,
 * unchanged by this migration.
 */
function RealtimeConnectionGate() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRestored = useAuthStore((state) => state.hasRestored);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Separate from the disconnect effect below on purpose: connectRealtimeSocket
  // already handles a rotated token by re-authenticating the existing socket
  // in place (without dropping subscribed screens' handlers), so this effect
  // must not disconnect on every token refresh — only on logout.
  useEffect(() => {
    if (!isAuthenticated || !hasRestored || !accessToken) {
      return;
    }

    connectRealtimeSocket(accessToken);
  }, [isAuthenticated, hasRestored, accessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    disconnectRealtimeSocket();
  }, [isAuthenticated]);

  return null;
}

export default function RootLayout() {
  // Critical local UI assets. Icon fonts are bundled with the app, so this
  // resolves in a few frames on a cold start; it is never blocked on the
  // network or on auth/remote data. Icons rendered before their font is
  // ready draw nothing, which is why the login checkbox/spinner only broke
  // on a fresh launch.
  const [fontsLoaded, fontError] = useFonts({
    "OleoScript-Regular": OleoScript_400Regular,
    ...Feather.font,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  // Image preload is best-effort and must never hold the splash open on its
  // own (a slow/missing image would otherwise wedge the whole app), so it
  // is kicked off here without gating first paint on it.
  useEffect(() => {
    Asset.loadAsync(CRITICAL_IMAGE_ASSETS).catch(() => undefined);
  }, []);

  const isBootReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (isBootReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isBootReady]);

  // Keep the native splash visible (render nothing) until local essentials
  // are ready. This is the only render gate — everything past this point
  // (auth restore, theme preference, feed data) loads behind skeletons and
  // never blocks the UI from mounting.
  if (!isBootReady) {
    return null;
  }

  return (
    // Non-visual wrapper required by react-native-gesture-handler's
    // GestureDetector (used by the Story image/text transform editor). It
    // must sit above every screen that may host a GestureDetector, so it
    // wraps the whole app rather than just the Story screens.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="post-screen/add-story"
            options={{
              animation: "fade",
              contentStyle: { backgroundColor: "#000000" },
              gestureEnabled: false,
              presentation: "fullScreenModal",
            }}
          />
        </Stack>
        <TicketWalletShortcut />
        <ThemePreferenceGate />
        <SystemNavigationBarGate />
        <AuthSessionGate />
        <LocationSharingGate />
        <PushNotificationGate />
        <RealtimeConnectionGate />
        <StatusBar style="auto" />
        <SuccessToastHost />
      </Provider>
    </GestureHandlerRootView>
  );
}
