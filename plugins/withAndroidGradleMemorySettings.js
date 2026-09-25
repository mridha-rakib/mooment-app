const { withGradleProperties } = require("@expo/config-plugins");

const gradleSettings = {
  "org.gradle.jvmargs":
    "-Xmx4096m -XX:MaxMetaspaceSize=1g -XX:ReservedCodeCacheSize=512m -Dfile.encoding=UTF-8",
  "org.gradle.parallel": "true",
  "org.gradle.workers.max": "8",
  "org.gradle.caching": "true",
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
