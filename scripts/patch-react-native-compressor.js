const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const compressorAndroid = path.join(
  packageRoot,
  "node_modules",
  "react-native-compressor",
  "android",
);

// 1. build.gradle — include oldarch source set so CompressorSpec is resolved
const buildGradlePath = path.join(compressorAndroid, "build.gradle");
if (fs.existsSync(buildGradlePath)) {
  let src = fs.readFileSync(buildGradlePath, "utf8");
  const target = 'manifest.srcFile "src/main/AndroidManifestNew.xml"';
  const replacement = `${target}\n      java.srcDirs += ["src/oldarch"]`;
  if (src.includes(target) && !src.includes('java.srcDirs += ["src/oldarch"]')) {
    fs.writeFileSync(buildGradlePath, src.replace(target, replacement));
    console.log("Patched react-native-compressor: build.gradle (added oldarch source set)");
  }
}

// 2. CompressorModule.kt — EventEmitterHandler no longer has reactContext in v2.x
const compressorModulePath = path.join(
  compressorAndroid,
  "src/main/java/com/reactnativecompressor/CompressorModule.kt",
);
if (fs.existsSync(compressorModulePath)) {
  let src = fs.readFileSync(compressorModulePath, "utf8");
  const old = "EventEmitterHandler.reactContext=reactContext;";
  if (src.includes(old)) {
    fs.writeFileSync(compressorModulePath, src.replace(old, ""));
    console.log("Patched react-native-compressor: CompressorModule.kt (removed stale reactContext assignment)");
  }
  // Also handle the getReactApplicationContext variant if postinstall ran twice
  const old2 = "EventEmitterHandler.reactContext=getReactApplicationContext();";
  if (src.includes(old2)) {
    fs.writeFileSync(compressorModulePath, src.replace(old2, ""));
    console.log("Patched react-native-compressor: CompressorModule.kt (removed stale reactContext assignment)");
  }
}

// 3. CompressorPackage.kt — IS_NEW_ARCHITECTURE_ENABLED was removed in RN 0.79+
const compressorPackagePath = path.join(
  compressorAndroid,
  "src/main/java/com/reactnativecompressor/CompressorPackage.kt",
);
if (fs.existsSync(compressorPackagePath)) {
  let src = fs.readFileSync(compressorPackagePath, "utf8");
  const old = "BuildConfig.IS_NEW_ARCHITECTURE_ENABLED";
  if (src.includes(old)) {
    fs.writeFileSync(compressorPackagePath, src.replace(old, "true"));
    console.log("Patched react-native-compressor: CompressorPackage.kt (fixed IS_NEW_ARCHITECTURE_ENABLED)");
  }
}
