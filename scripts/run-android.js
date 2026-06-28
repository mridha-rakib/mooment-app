const { existsSync, readFileSync } = require("fs");
const http = require("http");
const { join } = require("path");
const { spawn, spawnSync } = require("child_process");

const env = { ...process.env };
const ADB_TIMEOUT_MS = 15000;
const METRO_PORT = 8081;
const METRO_START_TIMEOUT_MS = 180000;
const API_PORT = 4000;

function firstExisting(paths) {
  return paths.find((path) => path && existsSync(path));
}

function prependPath(path) {
  const key = Object.keys(env).find((name) => name.toLowerCase() === "path") || "PATH";
  env[key] = `${path}${process.platform === "win32" ? ";" : ":"}${env[key] || ""}`;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: options.timeout,
    stdio: options.stdio || "pipe",
  });
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

function getAdbPath() {
  const adbExecutable = process.platform === "win32" ? "adb.exe" : "adb";

  return firstExisting([
    androidHome ? join(androidHome, "platform-tools", adbExecutable) : undefined,
    adbExecutable,
  ]);
}

function runAdb(adbPath, args, options = {}) {
  return run(adbPath, args, {
    timeout: options.timeout || ADB_TIMEOUT_MS,
    stdio: options.stdio,
  });
}

function stopGradleDaemons() {
  const androidDirectory = join(process.cwd(), "android");
  const gradleWrapper = join(androidDirectory, process.platform === "win32" ? "gradlew.bat" : "gradlew");

  if (!existsSync(gradleWrapper)) {
    return;
  }

  const command = process.platform === "win32" ? "cmd" : gradleWrapper;
  const args = process.platform === "win32" ? ["/c", gradleWrapper, "--stop"] : ["--stop"];
  const result = spawnSync(command, args, {
    cwd: androidDirectory,
    env,
    encoding: "utf8",
    stdio: "pipe",
    timeout: 30000,
  });

  if (result.status === 0) {
    console.log("Stopped Gradle daemons to release memory before Metro bundles the app.");
  }
}

function getAuthorizedDevices(adbPath) {
  const devicesResult = runAdb(adbPath, ["devices"]);

  if (devicesResult.error) {
    if (devicesResult.error.code === "ETIMEDOUT") {
      console.error("Timed out while listing Android devices with adb.");
      console.error("ADB is not responding. Run `adb kill-server` or unplug/replug the device, then retry.");
    } else {
      console.error(devicesResult.error.message);
    }

    return null;
  }

  if (devicesResult.status !== 0) {
    console.error(devicesResult.stderr || devicesResult.stdout || "Failed to list Android devices.");
    return null;
  }

  if (!adbPath) {
    return null;
  }

  return devicesResult.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === "device")
    .map(([serial]) => serial);
}

function reverseAndroidPorts(adbPath, devices, packageName) {
  for (const serial of devices) {
    if (packageName) {
      runAdb(adbPath, ["-s", serial, "shell", "am", "force-stop", packageName]);
    }

    runAdb(adbPath, ["-s", serial, "reverse", `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
    runAdb(adbPath, ["-s", serial, "reverse", `tcp:${API_PORT}`, `tcp:${API_PORT}`]);
  }
}

function getExpoConfig() {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "app.json"), "utf8"));
  } catch {
    // This project uses app.config.js.
  }

  try {
    const appConfigFactory = require(join(process.cwd(), "app.config.js"));
    const appConfig =
      typeof appConfigFactory === "function"
        ? appConfigFactory({ config: {} })
        : appConfigFactory;

    return appConfig;
  } catch {
    return undefined;
  }
}

function getAndroidPackageName(appConfig) {
  return appConfig?.expo?.android?.package;
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

function isMetroRunning() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: "127.0.0.1",
        port: METRO_PORT,
        path: "/status",
        timeout: 2000,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve(body.trim() === "packager-status:running");
        });
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => {
      resolve(false);
    });
  });
}

async function waitForMetro(timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isMetroRunning()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

const expoCli = require.resolve("expo/bin/cli");

function killProcessOnPort(port) {
  let killedProcess = false;

  if (process.platform === "win32") {
    const result = spawnSync("cmd", ["/c", `netstat -ano | findstr :${port} | findstr LISTENING`], {
      encoding: "utf8",
      stdio: "pipe",
    });
    if (result.stdout) {
      for (const line of result.stdout.trim().split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && parseInt(pid) > 0) {
          spawnSync("taskkill", ["/F", "/PID", pid], { stdio: "ignore" });
          killedProcess = true;
        }
      }
    }
  } else {
    const result = spawnSync("sh", ["-c", `lsof -ti:${port}`], {
      encoding: "utf8",
      stdio: "pipe",
    });

    for (const pid of (result.stdout || "").trim().split(/\s+/).filter(Boolean)) {
      spawnSync("kill", ["-9", pid], { stdio: "ignore" });
      killedProcess = true;
    }
  }

  return killedProcess;
}

async function startMetro() {
  const metroWasRunning = await isMetroRunning();

  if (metroWasRunning) {
    console.log(`Restarting Metro on port ${METRO_PORT}...`);
  }

  // The port may be held by a stale Metro process that no longer answers
  // /status. Clear any listener before asking Expo to use this fixed port.
  if (killProcessOnPort(METRO_PORT)) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const metro = spawn(
    process.execPath,
    [expoCli, "start", "--dev-client", "--port", String(METRO_PORT), "--max-workers", "1"],
    {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    }
  );

  let metroStopReason;
  const metroStopped = new Promise((resolve) => {
    metro.once("error", (error) => {
      metroStopReason = error.message;
      resolve(false);
    });
    metro.once("exit", (code, signal) => {
      metroStopReason = signal ? `signal ${signal}` : `exit code ${code}`;
      resolve(false);
    });
  });

  const metroReady = await Promise.race([waitForMetro(METRO_START_TIMEOUT_MS), metroStopped]);

  if (!metroReady) {
    if (metro.exitCode === null && !metro.killed) {
      metro.kill();
    }

    const reason = metroStopReason ? ` (${metroStopReason})` : "";
    throw new Error(`Metro did not become ready on port ${METRO_PORT}${reason}.`);
  }

  return metro;
}

function openDevClient(adbPath, devices, packageName, devClientScheme) {
  const devServerUrl = `http://localhost:${METRO_PORT}`;
  const devClientUrl = `${devClientScheme}://expo-development-client/?url=${encodeURIComponent(devServerUrl)}`;

  for (const serial of devices) {
    runAdb(adbPath, ["-s", serial, "shell", "am", "force-stop", packageName]);
    runAdb(adbPath, ["-s", serial, "reverse", `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
    runAdb(adbPath, ["-s", serial, "reverse", `tcp:${API_PORT}`, `tcp:${API_PORT}`]);

    const result = runAdb(adbPath, [
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

    if (result.status !== 0) {
      console.error(`Failed to open the development build on ${serial}.`);
      console.error(result.stderr || result.stdout);
      process.exit(result.status || 1);
    }

    console.log(`Opened ${devServerUrl} in ${packageName} on ${serial}.`);
  }
}

async function main() {
  const adbPath = getAdbPath();
  const appConfig = getExpoConfig();
  const packageName = getAndroidPackageName(appConfig);
  const devClientScheme = getDevClientScheme(appConfig);

  if (!adbPath) {
    console.error("Could not find adb. Set ANDROID_HOME or ANDROID_SDK_ROOT to your Android SDK path.");
    process.exit(1);
  }

  if (!packageName) {
    console.error("Missing expo.android.package in app config.");
    process.exit(1);
  }

  if (!devClientScheme) {
    console.error("Could not determine the Expo development-client URL scheme.");
    process.exit(1);
  }

  const metro = await startMetro();

  const devicesBeforeBuild = getAuthorizedDevices(adbPath);

  if (devicesBeforeBuild === null) {
    process.exit(1);
  }

  reverseAndroidPorts(adbPath, devicesBeforeBuild, packageName);

  const result = run(process.execPath, [expoCli, "run:android", "--no-bundler", ...process.argv.slice(2)], {
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }

  stopGradleDaemons();

  const devicesAfterBuild = getAuthorizedDevices(adbPath);

  if (devicesAfterBuild === null) {
    process.exit(1);
  }

  if (devicesAfterBuild.length === 0) {
    console.error("No authorized Android devices or emulators found after build.");
    process.exit(1);
  }

  openDevClient(adbPath, devicesAfterBuild, packageName, devClientScheme);

  if (metro) {
    await new Promise((resolve, reject) => {
      metro.on("close", resolve);
      metro.on("error", reject);
    });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
