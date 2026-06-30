/* global __dirname */

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
  let changed = false;

  // 1a. Add oldarch source set (original patch)
  const target = 'manifest.srcFile "src/main/AndroidManifestNew.xml"';
  const replacement = `${target}\n      java.srcDirs += ["src/oldarch"]`;
  if (src.includes(target) && !src.includes('java.srcDirs += ["src/oldarch"]')) {
    src = src.replace(target, replacement);
    changed = true;
    console.log("Patched react-native-compressor: build.gradle (added oldarch source set)");
  }

  // 1b. Remove the NitroModules Gradle apply — the app does not use react-native-nitro-modules
  const nitroApplyLine = "apply from: '../nitrogen/generated/android/NitroCompressor+autolinking.gradle'";
  if (src.includes(nitroApplyLine)) {
    src = src.replace(nitroApplyLine, "// [patched] nitro autolinking disabled — react-native-nitro-modules not installed");
    changed = true;
    console.log("Patched react-native-compressor: build.gradle (disabled NitroModules apply)");
  }

  // 1c. Remove the :react-native-nitro-modules project dependency
  const nitroDep = '  implementation project(":react-native-nitro-modules")';
  if (src.includes(nitroDep)) {
    src = src.replace(nitroDep, "  // [patched] react-native-nitro-modules not installed");
    changed = true;
    console.log("Patched react-native-compressor: build.gradle (removed :react-native-nitro-modules dependency)");
  }

  // 1d. Remove oldarch java.exclude lines if present (no longer needed — files are deleted)
  //     Keep the block clean; files in com/margelo/ are physically removed in step 6.
  const excludeBlock = `java.srcDirs += ["src/oldarch"]
      java.exclude 'com/margelo/**'
      java.exclude 'com/reactnativecompressor/NitroPromiseAdapter.java'`;
  if (src.includes(excludeBlock)) {
    src = src.replace(excludeBlock, 'java.srcDirs += ["src/oldarch"]');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(buildGradlePath, src);
  }
}

// 2. CMakeLists.txt — remove the Nitrogen cmake include that links react-native-nitro-modules
const cmakePath = path.join(compressorAndroid, "CMakeLists.txt");
if (fs.existsSync(cmakePath)) {
  let src = fs.readFileSync(cmakePath, "utf8");
  const nitroInclude = "include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroCompressor+autolinking.cmake)";
  if (src.includes(nitroInclude)) {
    src = src.replace(
      nitroInclude,
      "# [patched] NitroCompressor autolinking disabled — react-native-nitro-modules not installed",
    );
    fs.writeFileSync(cmakePath, src);
    console.log("Patched react-native-compressor: CMakeLists.txt (disabled Nitrogen cmake include)");
  }
}

// 3. cpp-adapter.cpp — replace Nitro JNI entry point with a no-op so CMake compiles cleanly
const cppAdapterPath = path.join(compressorAndroid, "src/main/cpp/cpp-adapter.cpp");
if (fs.existsSync(cppAdapterPath)) {
  const src = fs.readFileSync(cppAdapterPath, "utf8");
  if (src.includes("NitroCompressorOnLoad") || src.includes("registerAllNatives") || src.includes("fbjni/fbjni.h")) {
    const noopCpp = `// [patched] No-op JNI entry point — react-native-nitro-modules not installed.
// The old-arch Kotlin module (CompressorModule.kt) handles all functionality.
#include <jni.h>

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
  return JNI_VERSION_1_6;
}
`;
    fs.writeFileSync(cppAdapterPath, noopCpp);
    console.log("Patched react-native-compressor: cpp-adapter.cpp (replaced Nitro entry point with no-op)");
  }
}

// 4. NitroCompressorPackage.kt — remove import and init of NitroCompressorOnLoad
//    (generated Kotlin sources are excluded from compilation; the .so is a no-op)
const nitroPackagePath = path.join(
  compressorAndroid,
  "src/main/java/com/reactnativecompressor/NitroCompressorPackage.kt",
);
if (fs.existsSync(nitroPackagePath)) {
  let src = fs.readFileSync(nitroPackagePath, "utf8");
  let changed = false;

  const nitroImport = "import com.margelo.nitro.compressor.NitroCompressorOnLoad";
  if (src.includes(nitroImport)) {
    src = src.replace(nitroImport, "// [patched] NitroCompressorOnLoad removed");
    changed = true;
  }

  const initBlock = `  companion object {
    init {
      NitroCompressorOnLoad.initializeNative()
    }
  }`;
  if (src.includes(initBlock)) {
    src = src.replace(initBlock, "  // [patched] NitroCompressorOnLoad.initializeNative() removed");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(nitroPackagePath, src);
    console.log("Patched react-native-compressor: NitroCompressorPackage.kt (removed NitroCompressorOnLoad)");
  }
}

// 5. CompressorModule.kt — EventEmitterHandler no longer has reactContext in v2.x
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
  const old2 = "EventEmitterHandler.reactContext=getReactApplicationContext();";
  if (src.includes(old2)) {
    fs.writeFileSync(compressorModulePath, src.replace(old2, ""));
    console.log("Patched react-native-compressor: CompressorModule.kt (removed stale reactContext assignment)");
  }
}

// 5. CompressorPackage.kt — IS_NEW_ARCHITECTURE_ENABLED was removed in RN 0.79+
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

// 6. Physically delete Nitro-generated Kotlin sources that reference react-native-nitro-modules.
//    java.exclude in build.gradle only skips Java files; Kotlin files must be removed from disk.
const margeloDir = path.join(compressorAndroid, "src/main/java/com/margelo");
if (fs.existsSync(margeloDir)) {
  fs.rmSync(margeloDir, { recursive: true, force: true });
  console.log("Patched react-native-compressor: deleted com/margelo Nitro sources");
}
const nitroAdapter = path.join(
  compressorAndroid,
  "src/main/java/com/reactnativecompressor/NitroPromiseAdapter.java",
);
if (fs.existsSync(nitroAdapter)) {
  fs.rmSync(nitroAdapter);
  console.log("Patched react-native-compressor: deleted NitroPromiseAdapter.java");
}
