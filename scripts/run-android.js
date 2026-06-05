const { existsSync } = require("fs");
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
