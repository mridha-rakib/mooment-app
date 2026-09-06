import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Regression coverage for the cold-start / fresh-device UX fixes. Source-level
// assertions, matching this repo's established convention (there is no React
// Native render harness here). Each block documents the fresh-launch symptom
// it guards against.

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const rootLayoutSource = read("app/_layout.tsx");
const indexSource = read("app/index.tsx");
const useThemeSource = read("hooks/useTheme.ts");
const homeSource = read("app/(tabs)/home.tsx");
const loginSource = read("app/auth-screen/login.tsx");

// ── Bootstrap / first-paint architecture ────────────────────────────────

test("root layout holds the native splash until local fonts are ready", () => {
  assert.match(rootLayoutSource, /SplashScreen\.preventAutoHideAsync\(\)/);
  // Icon fonts must be preloaded — icons drawn before their font loads are
  // invisible, which is what broke the login checkbox/spinner on cold start.
  assert.match(rootLayoutSource, /\.\.\.Feather\.font/);
  assert.match(rootLayoutSource, /const \[fontsLoaded, fontError\] = useFonts\(/);
  // The one and only render gate: nothing mounts until essentials are ready.
  assert.match(rootLayoutSource, /if \(!isBootReady\) \{\s*return null;\s*\}/);
  assert.match(rootLayoutSource, /SplashScreen\.hideAsync\(\)/);
});

test("root layout no longer hides the splash on a fixed timer chain", () => {
  assert.doesNotMatch(rootLayoutSource, /\[250, 1000, 2000\]/);
  assert.doesNotMatch(rootLayoutSource, /SplashScreen\.hide\(\)/);
});

test("root layout never gates first paint on image preloading", () => {
  // Images are preloaded best-effort but must not be able to wedge the app.
  assert.match(rootLayoutSource, /Asset\.loadAsync\(CRITICAL_IMAGE_ASSETS\)\.catch/);
  assert.doesNotMatch(rootLayoutSource, /if \(!isBootReady && !assetsReady\)/);
});

test("splash index screen redirects with no arbitrary delay", () => {
  assert.doesNotMatch(indexSource, /setTimeout/);
  assert.doesNotMatch(indexSource, /1200/);
  assert.match(indexSource, /if \(isRestoring \|\| !hasRestored\) \{\s*return;\s*\}/);
});

// ── Theme hydration ────────────────────────────────────────────────────

test("useTheme has a synchronous color-scheme fallback for the first cold frame", () => {
  assert.match(
    useThemeSource,
    /useColorScheme\(\) \?\? Appearance\.getColorScheme\(\)/,
  );
  // System-mode resolution itself is unchanged.
  assert.match(useThemeSource, /themeSetting === 'system'/);
});

// ── Feed initial-loading state ─────────────────────────────────────────

test("feed treats the first render as loading so a skeleton shows immediately", () => {
  assert.match(
    homeSource,
    /const \[isFeedLoading, setIsFeedLoading\] = useState\(true\);/,
  );
  // The skeleton gate still requires "never loaded" + "no items" + "not a
  // pull-to-refresh", so a genuine empty feed is never masked as loading.
  assert.match(
    homeSource,
    /shouldShowFeedSkeleton = selectedType === 'Feed' && !hasFeedLoadedOnce && isFeedLoading && feedItems\.length === 0 && !isRefreshing/,
  );
  assert.match(
    homeSource,
    /ListEmptyComponent=\{shouldShowFeedSkeleton \? <FeedSkeletonList \/> : null\}/,
  );
});

test("feed empty state is still gated on loading actually finishing", () => {
  // The event empty-state check is fed the live isFeedLoading value, so it
  // cannot fire during the initial cold-start load (isFeedLoading starts true).
  assert.match(
    homeSource,
    /shouldShowEventFilterEmptyState\(\{[\s\S]*?isFeedLoading,[\s\S]*?\}\)/,
  );
});

// ── Login button: never an empty rectangle while submitting ────────────

test("login button renders a visible foreground in BOTH the idle and submitting states", () => {
  // Spinner colour and label colour both come from buttonForeground(colors),
  // which is a dark tone whenever the button background is white.
  assert.match(loginSource, /<Spinner color=\{buttonForeground\(colors\)\} \/>/);
  assert.match(
    loginSource,
    /<Text style=\{\[styles\.loginButtonText, \{ color: buttonForeground\(colors\) \}\]\}>Log In<\/Text>/,
  );
  // The button must always contain one of the two — no empty branch.
  assert.match(
    loginSource,
    /\{isLoading \? \(\s*<Spinner[\s\S]*?\) : \(\s*<Text[\s\S]*?Log In<\/Text>\s*\)\}/,
  );
});

test("keep-me-signed-in checkbox draws its checked mark from an icon glyph", () => {
  assert.match(
    loginSource,
    /keepSignedIn && <Feather name="check" size=\{12\} color=\{colors\.background\} \/>/,
  );
});
