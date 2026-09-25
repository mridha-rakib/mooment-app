const { existsSync, readFileSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const METRO_PORT = 8081;
const API_PORT = 4000;
const DEV_SERVER_HOST = "127.0.0.1";

function firstExisting(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate));
}

function readAndroidSdkFromLocalProperties() {
  try {
    const localProperties = readFileSync(join(process.cwd(), "android", "local.properties"), "utf8");
    const sdkLine = localProperties
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith("sdk.dir="));

    return sdkLine?.replace("sdk.dir=", "").trim().replace(/\//g, "\\");
  } catch {
    return undefined;
  }
}

function resolveAdbPath() {
  const executable = process.platform === "win32" ? "adb.exe" : "adb";
  const androidHome = firstExisting([
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    readAndroidSdkFromLocalProperties(),
    process.platform === "win32"
      ? join(process.env.LOCALAPPDATA || "", "Android", "Sdk")
      : undefined,
  ]);

  return firstExisting([
    androidHome ? join(androidHome, "platform-tools", executable) : undefined,
    executable,
  ]);
}

function runAdb(adbPath, args, options = {}) {
  return spawnSync(adbPath, args, {
    encoding: "utf8",
    stdio: options.stdio || "pipe",
  });
}

function getExpoConfig() {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "app.json"), "utf8"));
  } catch {
    // This project uses app.config.js.
  }

  try {
    const appConfigFactory = require(join(process.cwd(), "app.config.js"));
    return typeof appConfigFactory === "function"
      ? appConfigFactory({ config: {} })
      : appConfigFactory;
  } catch {
    return undefined;
  }
}

function getAndroidPackageName(appConfig) {
  const packageName = appConfig?.expo?.android?.package;

  if (!packageName) {
    throw new Error("Missing expo.android.package in app config.");
  }

  return packageName;
}

function getDevClientScheme(appConfig) {
  try {
    return require("expo-dev-client/getDefaultScheme")(appConfig.expo);
  } catch {
    const slug = appConfig?.expo?.slug;

    if (!slug) {
      return undefined;
    }

    const scheme = slug.replace(/[^A-Za-z0-9+\-.]/g, "").toLowerCase();
    return scheme ? `exp+${scheme}` : undefined;
  }
}

function getAndroidConfig() {
  const appConfig = getExpoConfig();
  const packageName = getAndroidPackageName(appConfig);
  const devClientScheme = getDevClientScheme(appConfig);

  if (!devClientScheme) {
    throw new Error("Could not determine the Expo development-client URL scheme.");
  }

  return {
    packageName,
    devClientScheme,
  };
}

function reverseDevelopmentPorts(adbPath, serial) {
  runAdb(adbPath, ["-s", serial, "reverse", `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
  runAdb(adbPath, ["-s", serial, "reverse", `tcp:${API_PORT}`, `tcp:${API_PORT}`]);
}

function openDevelopmentClient(adbPath, serial, packageName, devClientScheme) {
  const devServerUrl = `http://${DEV_SERVER_HOST}:${METRO_PORT}`;
  const devClientUrl = `${devClientScheme}://expo-development-client/?url=${encodeURIComponent(devServerUrl)}`;

  return runAdb(adbPath, [
    "-s",
    serial,
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    devClientUrl,
    "-p",
    packageName,
  ]);
}

function startLauncher(adbPath, serial, packageName) {
  return runAdb(adbPath, [
    "-s",
    serial,
    "shell",
    "monkey",
    "-p",
    packageName,
    "-c",
    "android.intent.category.LAUNCHER",
    "1",
  ]);
}

function sendReloadBroadcast(adbPath, serial, packageName) {
  const reloadAction = `${packageName}.RELOAD_APP_ACTION`;

  return runAdb(adbPath, [
    "-s",
    serial,
    "shell",
    "am",
    "broadcast",
    "-a",
    reloadAction,
    "-p",
    packageName,
  ]);
}

function readAndroidConfig() {
  try {
    return getAndroidConfig();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const adbPath = resolveAdbPath();

if (!adbPath) {
  console.error("Could not find adb. Set ANDROID_HOME or ANDROID_SDK_ROOT to your Android SDK path.");
  process.exit(1);
}

const devicesResult = runAdb(adbPath, ["devices"]);

if (devicesResult.status !== 0) {
  console.error(devicesResult.stderr || devicesResult.stdout || "Failed to list Android devices.");
  process.exit(devicesResult.status || 1);
}

const devices = devicesResult.stdout
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.trim().split(/\s+/))
  .filter(([serial, state]) => serial && state === "device")
  .map(([serial]) => serial);

if (devices.length === 0) {
  console.error("No authorized Android devices or emulators found.");
  process.exit(1);
}

const { packageName, devClientScheme } = readAndroidConfig();
let failed = false;

for (const serial of devices) {
  runAdb(adbPath, ["-s", serial, "shell", "am", "force-stop", packageName]);
  reverseDevelopmentPorts(adbPath, serial);

  const result = openDevelopmentClient(adbPath, serial, packageName, devClientScheme);

  if (result.status === 0) {
    console.log(`Opened http://${DEV_SERVER_HOST}:${METRO_PORT} in ${packageName} on ${serial}.`);
    continue;
  }

  const launcherResult = startLauncher(adbPath, serial, packageName);

  if (launcherResult.status === 0) {
    console.log(`App restarted on ${serial}.`);
    continue;
  }

  const fallbackResult = sendReloadBroadcast(adbPath, serial, packageName);

  if (fallbackResult.status === 0) {
    console.log(`Reload signal sent to ${serial}.`);
    continue;
  }

  failed = true;
  console.error(`Failed to restart ${serial}.`);
  console.error(fallbackResult.stderr || fallbackResult.stdout || launcherResult.stderr || launcherResult.stdout || result.stderr || result.stdout);
}

process.exit(failed ? 1 : 0);
