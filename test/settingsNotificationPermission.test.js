const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const source = readFileSync(join(process.cwd(), "app/profile-screen/settings.tsx"), "utf8");

const refreshStart = source.indexOf("const refreshNotificationPermission = useCallback");
const firstEffectStart = source.indexOf("  useEffect(() => {", refreshStart);
const handlerStart = source.indexOf("const handleNotificationChange = async");
const handlerEnd = source.indexOf("  const handleConfirmDeleteAccount", handlerStart);

if (refreshStart === -1 || firstEffectStart === -1 || handlerStart === -1 || handlerEnd === -1) {
  throw new Error("Settings notification permission source blocks were not found.");
}

const refreshSource = source.slice(refreshStart, firstEffectStart);
const handlerSource = source.slice(handlerStart, handlerEnd);

test("Notification switch is derived from backend preference and OS permission", () => {
  assert.match(source, /const backendNotificationsEnabled = user\?\.notificationsEnabled \?\? true;/);
  assert.match(source, /const notificationOsPermissionGranted = notificationPermissionState === "granted";/);
  assert.match(source, /const notificationEnabled = backendNotificationsEnabled && notificationOsPermissionGranted;/);
});

test("Settings mount checks notification permission without prompting", () => {
  assert.match(refreshSource, /Notifications\.getPermissionsAsync\(\)/);
  assert.doesNotMatch(refreshSource, /requestPermissionsAsync/);
});

test("enabling notifications requests permission only when it can still be requested", () => {
  assert.match(handlerSource, /Notifications\.getPermissionsAsync\(\)/);
  assert.match(
    handlerSource,
    /nextPermissionState === "denied" && permission\.canAskAgain !== false[\s\S]*Notifications\.requestPermissionsAsync\(\)/,
  );
  assert.match(
    handlerSource,
    /nextPermissionState === "granted"[\s\S]*notificationsEnabled: true/,
  );
});

test("denied notification permission does not leave backend preference misleadingly enabled", () => {
  assert.match(
    handlerSource,
    /if \(backendNotificationsEnabled\) \{[\s\S]*notificationsEnabled: false/,
  );
  assert.match(handlerSource, /nextPermissionState === "blocked"[\s\S]*Linking\.openSettings\(\)/);
});

test("disabling notifications updates backend preference only", () => {
  const disableStart = handlerSource.indexOf("if (!nextValue)");
  const enableStart = handlerSource.indexOf('const Notifications = await import("expo-notifications")');
  const disableSource = handlerSource.slice(disableStart, enableStart);

  assert.match(disableSource, /notificationsEnabled: false/);
  assert.doesNotMatch(disableSource, /requestPermissionsAsync|getPermissionsAsync|openSettings/);
});

test("notification toggle refreshes permission after returning from system settings and blocks rapid taps", () => {
  assert.match(source, /AppState\.addEventListener\("change"/);
  assert.match(source, /nextState === "active"[\s\S]*refreshNotificationPermission\(\)/);
  assert.match(source, /const notificationUpdateRef = useRef\(false\);/);
  assert.match(handlerSource, /if \(notificationUpdateRef\.current\)/);
  assert.match(handlerSource, /notificationUpdateRef\.current = true;/);
  assert.match(handlerSource, /notificationUpdateRef\.current = false;/);
});
