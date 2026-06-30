import { useRouter } from 'expo-router';

/**
 * Navigates back if history exists; otherwise replaces with the given fallback route.
 * Prevents the "GO_BACK was not handled by any navigator" warning when a screen
 * is opened directly (deep link, notification, auth redirect) without prior history.
 */
export function safeBack(
  router: ReturnType<typeof useRouter>,
  fallback: string = '/(tabs)/home',
): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(fallback as any);
  }
}
