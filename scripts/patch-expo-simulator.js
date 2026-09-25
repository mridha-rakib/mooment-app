const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");

const candidatePrereqPaths = [
  path.join(
    packageRoot,
    "node_modules",
    "expo",
    "node_modules",
    "@expo",
    "cli",
    "build",
    "src",
    "start",
    "doctor",
    "apple",
    "SimulatorAppPrerequisite.js",
  ),
  path.join(
    packageRoot,
    "node_modules",
    "@expo",
    "cli",
    "build",
    "src",
    "start",
    "doctor",
    "apple",
    "SimulatorAppPrerequisite.js",
  ),
];

const candidateEnsurePaths = [
  path.join(
    packageRoot,
    "node_modules",
    "expo",
    "node_modules",
    "@expo",
    "cli",
    "build",
    "src",
    "start",
    "platforms",
    "ios",
    "ensureSimulatorAppRunning.js",
  ),
  path.join(
    packageRoot,
    "node_modules",
    "@expo",
    "cli",
    "build",
    "src",
    "start",
    "platforms",
    "ios",
    "ensureSimulatorAppRunning.js",
  ),
];

const candidateAppleDevicePaths = [
  path.join(
    packageRoot,
    "node_modules",
    "expo",
    "node_modules",
    "@expo",
    "cli",
    "build",
    "src",
    "start",
    "platforms",
    "ios",
    "AppleDeviceManager.js",
  ),
  path.join(
    packageRoot,
    "node_modules",
    "@expo",
    "cli",
    "build",
    "src",
    "start",
    "platforms",
    "ios",
    "AppleDeviceManager.js",
  ),
];

let patchedCount = 0;

for (const prereqPath of candidatePrereqPaths) {
  if (!fs.existsSync(prereqPath)) {
    continue;
  }

  const source = fs.readFileSync(prereqPath, "utf8");
  if (source.includes("'com.apple.iphonesimulator'")) {
    continue;
  }

  const targetPattern = /return\s+(await\s+getSimulatorAppIdViaAppleScriptAsync\(\)\s+\?\?\s+await\s+getSimulatorAppIdFromBundleAsync\(\));/;

  if (targetPattern.test(source)) {
    const patched = source.replace(
      targetPattern,
      "return $1 ?? 'com.apple.iphonesimulator';",
    );
    if (patched !== source) {
      fs.writeFileSync(prereqPath, patched);
      patchedCount += 1;
    }
  }
}

for (const ensurePath of candidateEnsurePaths) {
  if (!fs.existsSync(ensurePath)) {
    continue;
  }

  const source = fs.readFileSync(ensurePath, "utf8");
  if (source.includes("async function isSimulatorAppRunningAsync() {\n    return true;\n}")) {
    continue;
  }

  const targetPattern = /async function isSimulatorAppRunningAsync\(\)\s*\{[\s\S]*?\n\}/;

  if (targetPattern.test(source)) {
    const patched = source.replace(
      targetPattern,
      "async function isSimulatorAppRunningAsync() {\n    return true;\n}",
    );
    if (patched !== source) {
      fs.writeFileSync(ensurePath, patched);
      patchedCount += 1;
    }
  }
}

for (const appleDevicePath of candidateAppleDevicePaths) {
  if (!fs.existsSync(appleDevicePath)) {
    continue;
  }

  const source = fs.readFileSync(appleDevicePath, "utf8");
  const targetPattern = /async activateWindowAsync\(\)\s*\{[\s\S]*?(?=\s+getExpoGoAppId\(\))/;

  if (targetPattern.test(source)) {
    const replacement = `async activateWindowAsync() {
        await (0, _ensureSimulatorAppRunning.ensureSimulatorAppRunningAsync)(this.device);
        try {
            await _osascript().execAsync(\`tell application "Simulator" to activate\`);
        } catch {
            // noop for Xcode 27+ integrated simulator where standalone "Simulator" AppleScript target is not available
        }
    }`;
    const patched = source.replace(targetPattern, replacement);
    if (patched !== source) {
      fs.writeFileSync(appleDevicePath, patched);
      patchedCount += 1;
    }
  }
}

if (patchedCount > 0) {
  console.log("Patched Expo CLI iOS Simulator prerequisite checks and window activation for Xcode 27+.");
}

