const { existsSync, readFileSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

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

function getAndroidPackageName() {
  const appConfig = JSON.parse(readFileSync(join(process.cwd(), "app.json"), "utf8"));
  const packageName = appConfig?.expo?.android?.package;

  if (!packageName) {
    throw new Error("Missing expo.android.package in app.json.");
  }

  return packageName;
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

const packageName = getAndroidPackageName();
const reloadAction = `${packageName}.RELOAD_APP_ACTION`;
let failed = false;

for (const serial of devices) {
  runAdb(adbPath, ["-s", serial, "reverse", "tcp:8081", "tcp:8081"]);

  const result = runAdb(adbPath, [
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

  if (result.status === 0) {
    console.log(`Reload signal sent to ${serial}.`);
    continue;
  }

  failed = true;
  console.error(`Failed to reload ${serial}.`);
  console.error(result.stderr || result.stdout);
}

process.exit(failed ? 1 : 0);
