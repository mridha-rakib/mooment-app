const fs = require("node:fs");
const path = require("node:path");
const appJson = require("./app.base.json");

const readEnvFile = () => {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return {};
  }

  return fs.readFileSync(envPath, "utf8").split(/\r?\n/).reduce((env, line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return env;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      return env;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    env[key] = value.replace(/^["']|["']$/g, "");

    return env;
  }, {});
};

const fileEnv = readEnvFile();
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || fileEnv.EXPO_PUBLIC_API_BASE_URL;
const appVariant = process.env.APP_VARIANT || process.env.EAS_BUILD_PROFILE || "development";

const variantConfig = {
  development: {
    name: "Mooments Dev",
    scheme: "mooments-dev",
    androidPackage: "com.mooments.app",
  },
  preview: {
    name: "Mooments Preview",
    scheme: "mooments-preview",
    androidPackage: "com.mooments.app.preview",
  },
};

const selectedVariant = variantConfig[appVariant];

module.exports = ({ config }) => {
  const baseConfig = {
    ...config,
    ...appJson.expo,
    android: {
      ...config.android,
      ...appJson.expo.android,
    },
    extra: {
      ...config.extra,
      ...appJson.expo.extra,
    },
  };

  return {
    expo: {
      ...baseConfig,
      name: selectedVariant?.name || baseConfig.name,
      scheme: selectedVariant?.scheme || baseConfig.scheme,
      android: {
        ...baseConfig.android,
        package: selectedVariant?.androidPackage || baseConfig.android?.package,
      },
      plugins: [...(baseConfig.plugins || []), "./plugins/withUsesCleartextTraffic"],
      extra: {
        ...baseConfig.extra,
        apiBaseUrl,
      },
    },
  };
};
