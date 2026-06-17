const { withGradleProperties } = require("@expo/config-plugins");

const gradleSettings = {
  "org.gradle.jvmargs":
    "-Xmx1536m -XX:MaxMetaspaceSize=512m -XX:ReservedCodeCacheSize=256m -Dfile.encoding=UTF-8",
  "org.gradle.parallel": "false",
  "org.gradle.workers.max": "4",
};

function setGradleProperty(properties, key, value) {
  const existingProperty = properties.find((property) => property.type === "property" && property.key === key);

  if (existingProperty) {
    existingProperty.value = value;
    return;
  }

  properties.push({ type: "property", key, value });
}

const withAndroidGradleMemorySettings = (config) =>
  withGradleProperties(config, (config) => {
    Object.entries(gradleSettings).forEach(([key, value]) => {
      setGradleProperty(config.modResults, key, value);
    });

    return config;
  });

module.exports = withAndroidGradleMemorySettings;
