import { OleoScript_400Regular, useFonts } from '@expo-google-fonts/oleo-script';
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { readThemePreference } from "@/lib/themePreference";
import { setTheme } from "@/redux/slice/preference";
import { store } from '../redux/store';
import { useAuthStore } from '@/stores/authStore';
import { useLocationSharingStore } from '@/stores/locationSharingStore';
import { installLogBoxStackGuard } from '@/lib/installLogBoxStackGuard';
import { registerFcmToken } from '@/lib/notifications';

installLogBoxStackGuard();

function AuthSessionGate() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const hasRestored = useAuthStore((state) => state.hasRestored);
  const restoreAuthSession = useAuthStore((state) => state.restoreAuthSession);

  useEffect(() => {
    void restoreAuthSession();
  }, [restoreAuthSession]);

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (isRestoring || !hasRestored) return;

    const firstSegment = segments[0];
    const secondSegment = segments[1];
    const isAuthRoute = firstSegment === 'auth-screen';
    const isPostVerificationRoute = secondSegment === 'success-verified' || secondSegment === 'onboarding-settings';
    const isPublicRoute = !firstSegment || isAuthRoute || firstSegment === 'error';

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/auth-screen/onboarding' as any);
      return;
    }

    if (isAuthenticated && isAuthRoute && !isPostVerificationRoute) {
      router.replace('/(tabs)/home' as any);
    }
  }, [hasRestored, isAuthenticated, isRestoring, rootNavigationState, router, segments]);

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

function LocationSharingGate() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRestored = useAuthStore((state) => state.hasRestored);
  const locationSharingEnabled = useAuthStore((state) => Boolean(state.user?.currentLocationSharingEnabled));
  const startWatching = useLocationSharingStore((state) => state.startWatching);
  const stopWatching = useLocationSharingStore((state) => state.stopWatching);
  const disableSharing = useLocationSharingStore((state) => state.disableSharing);

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
  }, [disableSharing, hasRestored, isAuthenticated, locationSharingEnabled, startWatching, stopWatching]);

  return null;
}

function PushNotificationGate() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRestored = useAuthStore((state) => state.hasRestored);

  useEffect(() => {
    if (!isAuthenticated || !hasRestored) return;
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    let tokenSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    const setup = async () => {
      try {
        const Notifications = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          if (__DEV__) console.log('[Push] Permission not granted');
          return;
        }

        const tokenData = await Notifications.getDevicePushTokenAsync();
        const token = tokenData.data as string;

        if (__DEV__) console.log('[Push] FCM token obtained', token);

        await registerFcmToken(token, Platform.OS).catch(() => undefined);

        tokenSubscription = Notifications.addPushTokenListener((newToken) => {
          if (__DEV__) console.log('[Push] FCM token refreshed', newToken.data);
          registerFcmToken(newToken.data as string, Platform.OS).catch(() => undefined);
        });

        const navigateFromNotification = (data: Record<string, string> | undefined) => {
          if (!data) return;
          if (__DEV__) console.log('[Push] Notification tapped', data);
          if (data.type === 'dm' && data.conversationPartnerId) {
            router.push({
              pathname: '/chat-screen/chat-detail',
              params: {
                id: data.conversationPartnerId,
                name: data.senderName ?? 'Chat',
                ...(data.senderAvatar ? { avatar: data.senderAvatar } : {}),
              },
            } as any);
          } else if (data.type === 'group' && data.groupId) {
            router.push({
              pathname: '/chat-screen/chat-detail',
              params: {
                id: data.groupId,
                name: data.groupName ?? 'Group',
                isGroup: 'true',
                ...(data.groupAvatar ? { avatar: data.groupAvatar } : {}),
              },
            } as any);
          }
        };

        // Handle tap when app is launched from a killed state
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          navigateFromNotification(lastResponse.notification.request.content.data as Record<string, string> | undefined);
        }

        responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
          navigateFromNotification(response.notification.request.content.data as Record<string, string> | undefined);
        });
      } catch (error) {
        if (__DEV__) console.log('[Push] Setup failed', error);
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

export default function RootLayout() {
  useFonts({
    'OleoScript-Regular': OleoScript_400Regular,
  });

  useEffect(() => {
    const hideSplashScreen = () => {
      SplashScreen.hide();
    };

    hideSplashScreen();
    const timers = [250, 1000, 2000].map((delay) =>
      setTimeout(hideSplashScreen, delay)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="post-screen/add-story"
          options={{
            animation: 'fade',
            contentStyle: { backgroundColor: '#000000' },
            gestureEnabled: false,
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
      <ThemePreferenceGate />
      <AuthSessionGate />
      <LocationSharingGate />
      <PushNotificationGate />
      <StatusBar style="auto" />
    </Provider>
  );
}
