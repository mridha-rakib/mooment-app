const { readFileSync, writeFileSync } = require("fs");
const { dirname, join } = require("path");

// Foojay before 1.0 references IBM_SEMERU, which Gradle 9 removed.
// Patch the included build: the app's plugin resolution does not apply to it.
const settingsPath = join(
  dirname(require.resolve("@react-native/gradle-plugin/package.json")),
  "settings.gradle.kts",
);
const source = readFileSync(settingsPath, "utf8");
const patched = source.replace(
  /(id\("org\.gradle\.toolchains\.foojay-resolver-convention"\)\.version\(")0\.[\d.]+("\))/g,
  "$11.0.0$2",
);

if (patched !== source) {
  writeFileSync(settingsPath, patched);
  console.log("Patched React Native's Foojay resolver to 1.0.0 for Gradle 9.");
}
