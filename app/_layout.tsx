import { OleoScript_400Regular, useFonts } from '@expo-google-fonts/oleo-script';
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Provider, useDispatch } from 'react-redux';
import { readThemePreference } from "@/lib/themePreference";
import { setTheme } from "@/redux/slice/preference";
import { store } from '../redux/store';
import { useAuthStore } from '@/stores/authStore';
import { useLocationSharingStore } from '@/stores/locationSharingStore';
import { installLogBoxStackGuard } from '@/lib/installLogBoxStackGuard';

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
      <Stack screenOptions={{ headerShown: false }} />
      <ThemePreferenceGate />
      <AuthSessionGate />
      <LocationSharingGate />
      <StatusBar style="auto" />
    </Provider>
  );
}
