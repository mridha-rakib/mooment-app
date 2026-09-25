const { withDangerousMod, withInfoPlist } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const markerStart = "# @generated begin xenog-ios-deployment-target";
const markerEnd = "# @generated end xenog-ios-deployment-target";

const snippet = `    ${markerStart}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
    installer.aggregate_targets.each do |aggregate_target|
      aggregate_target.user_project.native_targets.each do |target|
        target.build_configurations.each do |config|
          if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
            config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
          end
        end
      end
    end
    ${markerEnd}`;

const updatePodfileContent = (podfileContent) => {
  // 1. Clean up any previous injection, including broken legacy injection with a trailing comma
  podfileContent = podfileContent.replace(
    /\n*\s*# @generated begin xenog-ios-deployment-target[\s\S]*?# @generated end xenog-ios-deployment-target,/,
    ","
  );
  podfileContent = podfileContent.replace(
    /\n*\s*# @generated begin xenog-ios-deployment-target[\s\S]*?# @generated end xenog-ios-deployment-target/,
    ""
  );

  // 2. Find react_native_post_install and its matching closing parenthesis
  const postInstallMarker = "react_native_post_install(";
  const postInstallIdx = podfileContent.indexOf(postInstallMarker);
  let inserted = false;

  if (postInstallIdx !== -1) {
    let depth = 0;
    let closingParenIdx = -1;
    for (
      let i = postInstallIdx + postInstallMarker.length - 1;
      i < podfileContent.length;
      i++
    ) {
      if (podfileContent[i] === "(") {
        depth++;
      } else if (podfileContent[i] === ")") {
        depth--;
        if (depth === 0) {
          closingParenIdx = i;
          break;
        }
      }
    }

    if (closingParenIdx !== -1) {
      podfileContent =
        podfileContent.slice(0, closingParenIdx + 1) +
        "\n\n" +
        snippet +
        podfileContent.slice(closingParenIdx + 1);
      inserted = true;
    }
  }

  // 3. Fallback: if react_native_post_install is not matched, place inside post_install block
  if (!inserted) {
    const postInstallBlockMarker = "post_install do |installer|";
    const blockIdx = podfileContent.indexOf(postInstallBlockMarker);
    if (blockIdx !== -1) {
      const insertAt = blockIdx + postInstallBlockMarker.length;
      podfileContent =
        podfileContent.slice(0, insertAt) +
        "\n" +
        snippet +
        podfileContent.slice(insertAt);
      inserted = true;
    }
  }

  return podfileContent;
};

const withIosDeploymentTarget = (config) => {
  // Ensure UIApplicationSceneManifest is NOT present in Info.plist (it causes a blank screen because React Native uses AppDelegate, not SceneDelegate)
  config = withInfoPlist(config, (plistConfig) => {
    delete plistConfig.modResults.UIApplicationSceneManifest;
    return plistConfig;
  });

  // Ensure Podfile sets IPHONEOS_DEPLOYMENT_TARGET >= 15.1
  config = withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) {
        return modConfig;
      }

      let podfileContent = fs.readFileSync(podfilePath, "utf8");
      podfileContent = updatePodfileContent(podfileContent);
      fs.writeFileSync(podfilePath, podfileContent);
      return modConfig;
    },
  ]);

  return config;
};

module.exports = withIosDeploymentTarget;
