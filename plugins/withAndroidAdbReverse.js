const { withAppBuildGradle } = require("@expo/config-plugins");

const markerStart = "// @generated begin xenog-adb-reverse";
const markerEnd = "// @generated end xenog-adb-reverse";

const adbReverseBlock = `${markerStart}
def xenogAdbReverseApiPort = 4000

def xenogReadDotEnvValue = { key ->
    def envFile = new File(rootDir.getAbsoluteFile().getParentFile().getAbsolutePath(), ".env")

    if (!envFile.exists()) {
        return null
    }

    def prefix = "\${key}="
    def line = envFile.readLines().find { rawLine ->
        def trimmedLine = rawLine.trim()
        trimmedLine && !trimmedLine.startsWith("#") && trimmedLine.startsWith(prefix)
    }

    if (!line) {
        return null
    }

    return line.substring(line.indexOf("=") + 1).trim().replaceAll(/^['"]|['"]$/, "")
}

def xenogConfiguredApiBaseUrl =
    System.getenv("EXPO_PUBLIC_API_BASE_URL") ?: xenogReadDotEnvValue("EXPO_PUBLIC_API_BASE_URL")

try {
    if (xenogConfiguredApiBaseUrl) {
        def apiUrl = new URI(xenogConfiguredApiBaseUrl)

        if (apiUrl.port > 0) {
            xenogAdbReverseApiPort = apiUrl.port
        } else if (apiUrl.scheme == "https") {
            xenogAdbReverseApiPort = 443
        } else if (apiUrl.scheme == "http") {
            xenogAdbReverseApiPort = 80
        }
    }
} catch (ignored) {
    // Keep the development default.
}

def xenogResolveAdbExecutable = {
    def adbName = org.gradle.internal.os.OperatingSystem.current().isWindows() ? "adb.exe" : "adb"
    def candidates = [
        System.getenv("ANDROID_HOME"),
        System.getenv("ANDROID_SDK_ROOT"),
        android.sdkDirectory?.absolutePath,
    ].findAll { it }
        .collect { new File(new File(it, "platform-tools"), adbName) }

    return candidates.find { it.exists() } ?: new File(adbName)
}

def xenogRunProcess = { args ->
    def output = new ByteArrayOutputStream()
    def process = new ProcessBuilder(args.collect { it.toString() })
        .redirectErrorStream(true)
        .start()

    process.inputStream.withStream { outputStream ->
        outputStream.transferTo(output)
    }
    process.waitFor()

    return output.toString()
}

def xenogReverseAndroidPort = { port ->
    def adbExecutable = xenogResolveAdbExecutable()
    def devicesOutput = xenogRunProcess([adbExecutable.absolutePath, "devices"])

    devicesOutput
        .readLines()
        .drop(1)
        .collect { it.trim().split(/\\s+/) }
        .findAll { it.size() >= 2 && it[1] == "device" }
        .each { device ->
            xenogRunProcess([adbExecutable.absolutePath, "-s", device[0], "reverse", "tcp:\${port}", "tcp:\${port}"])
        }
}

afterEvaluate {
    tasks.matching { task ->
        task.name == "installDebug" || task.name == "installDevelopmentDebug"
    }.configureEach { task ->
        task.doFirst {
            xenogReverseAndroidPort(8081)
            xenogReverseAndroidPort(xenogAdbReverseApiPort)
            println "Configured adb reverse for Metro port 8081 and API port \${xenogAdbReverseApiPort}."
        }
    }
}
${markerEnd}`;

const withAndroidAdbReverse = (config) =>
  withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const markerStartIndex = contents.indexOf(markerStart);
    const markerEndIndex = contents.indexOf(markerEnd);

    if (markerStartIndex !== -1 && markerEndIndex !== -1) {
      config.modResults.contents =
        contents.slice(0, markerStartIndex) +
        adbReverseBlock +
        contents.slice(markerEndIndex + markerEnd.length);
    } else {
      config.modResults.contents = `${contents.trimEnd()}\n\n${adbReverseBlock}\n`;
    }

    return config;
  });

module.exports = withAndroidAdbReverse;
