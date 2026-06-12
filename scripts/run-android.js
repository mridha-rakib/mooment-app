const { existsSync, readFileSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const env = { ...process.env };

function firstExisting(paths) {
  return paths.find((path) => path && existsSync(path));
}

function prependPath(path) {
  const key = Object.keys(env).find((name) => name.toLowerCase() === "path") || "PATH";
  env[key] = `${path}${process.platform === "win32" ? ";" : ":"}${env[key] || ""}`;
}

const javaHome = firstExisting([
  env.JAVA_HOME,
  "C:\\Program Files\\Android\\Android Studio\\jbr",
  "C:\\Users\\rakib\\.gradle\\jdks\\eclipse_adoptium-17-amd64-windows.2",
]);

if (!javaHome) {
  console.error("JAVA_HOME is not set and no local Android Studio JDK was found.");
  process.exit(1);
}

env.JAVA_HOME = javaHome;
prependPath(join(javaHome, "bin"));

const androidHome = firstExisting([
  env.ANDROID_HOME,
  env.ANDROID_SDK_ROOT,
  "C:\\Users\\rakib\\AppData\\Local\\Android\\Sdk",
]);

if (androidHome) {
  env.ANDROID_HOME = androidHome;
  env.ANDROID_SDK_ROOT = androidHome;
  prependPath(join(androidHome, "platform-tools"));
  prependPath(join(androidHome, "emulator"));
}

function reverseAndroidPorts() {
  const adbExecutable = process.platform === "win32" ? "adb.exe" : "adb";
  const adbPath = firstExisting([
    androidHome ? join(androidHome, "platform-tools", adbExecutable) : undefined,
    adbExecutable,
  ]);

  if (!adbPath) {
    return;
  }

  const devicesResult = spawnSync(adbPath, ["devices"], {
    encoding: "utf8",
  });

  if (devicesResult.status !== 0) {
    return;
  }

  const devices = devicesResult.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === "device")
    .map(([serial]) => serial);
  let packageName;

  packageName = getAndroidPackageName();

  for (const serial of devices) {
    if (packageName) {
      spawnSync(adbPath, ["-s", serial, "shell", "am", "force-stop", packageName]);
    }

    spawnSync(adbPath, ["-s", serial, "reverse", "tcp:8081", "tcp:8081"]);
    spawnSync(adbPath, ["-s", serial, "reverse", "tcp:4000", "tcp:4000"]);
  }
}

function getAndroidPackageName() {
  try {
    const appConfig = JSON.parse(readFileSync(join(process.cwd(), "app.json"), "utf8"));
    return appConfig?.expo?.android?.package;
  } catch {
    // This project uses app.config.js.
  }

  try {
    const appConfigFactory = require(join(process.cwd(), "app.config.js"));
    const appConfig =
      typeof appConfigFactory === "function"
        ? appConfigFactory({ config: {} })
        : appConfigFactory;

    return appConfig?.expo?.android?.package;
  } catch {
    return undefined;
  }
}

reverseAndroidPorts();

const expoCli = require.resolve("expo/bin/cli");
const result = spawnSync(process.execPath, [expoCli, "run:android"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
