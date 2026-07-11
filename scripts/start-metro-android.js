const { existsSync, readFileSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const METRO_PORT = 8081;
const expoCli = require.resolve("expo/bin/cli");
const DEV_SERVER_HOST = "127.0.0.1";

function firstExisting(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate));
}

function readEnvFile() {
  try {
    return readFileSync(join(process.cwd(), ".env"), "utf8")
      .split(/\r?\n/)
      .reduce((env, line) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
          return env;
        }

        const separatorIndex = trimmed.indexOf("=");

        if (separatorIndex === -1) {
          return env;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

        env[key] = value;
        return env;
      }, {});
  } catch {
    return {};
  }
}

function getApiPort() {
  const fileEnv = readEnvFile();
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL || fileEnv.EXPO_PUBLIC_API_BASE_URL;

  try {
    const url = new URL(configuredUrl);

    if (url.port) {
      return Number(url.port);
    }

    return url.protocol === "https:" ? 443 : 80;
  } catch {
    return undefined;
  }
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

function runAdb(adbPath, args) {
  return spawnSync(adbPath, args, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

function getAuthorizedDevices(adbPath) {
  const devicesResult = runAdb(adbPath, ["devices"]);

  if (devicesResult.status !== 0) {
    return [];
  }

  return devicesResult.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === "device")
    .map(([serial]) => serial);
}

function reverseDevelopmentPorts() {
  const adbPath = resolveAdbPath();
  const apiPort = getApiPort();

  if (!adbPath || !apiPort) {
    return;
  }

  const devices = getAuthorizedDevices(adbPath);

  for (const serial of devices) {
    runAdb(adbPath, ["-s", serial, "reverse", `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
    runAdb(adbPath, ["-s", serial, "reverse", `tcp:${apiPort}`, `tcp:${apiPort}`]);
  }
}

const env = {
  ...process.env,
  REACT_NATIVE_PACKAGER_HOSTNAME: DEV_SERVER_HOST,
};

reverseDevelopmentPorts();

const result = spawnSync(
  process.execPath,
  [
    expoCli,
    "start",
    "--dev-client",
    "--host",
    "lan",
    "--port",
    String(METRO_PORT),
    "--max-workers",
    "1",
    ...process.argv.slice(2),
  ],
  {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
