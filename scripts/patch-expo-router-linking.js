const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");

// 1. Patch useLinking.native.js
const useLinkingPath = path.join(
  packageRoot,
  "node_modules",
  "expo-router",
  "build",
  "fork",
  "useLinking.native.js",
);

if (fs.existsSync(useLinkingPath)) {
  let source = fs.readFileSync(useLinkingPath, "utf8");
  const original = source;

  const helperMarker = "const scheduleUnhandledLinking = React.useCallback";
  const anchor = `    const getStateFromURL = React.useCallback((url) => {
        if (!url || (filterRef.current && !filterRef.current(url))) {
            return undefined;
        }
        const path = (0, extractPathFromURL_1.extractExpoPathFromURL)(prefixesRef.current, url);
        return path !== undefined ? getStateFromPathRef.current(path, configRef.current) : undefined;
    }, []);
`;

  if (!source.includes(helperMarker)) {
    const replacement = `${anchor}    const scheduleUnhandledLinking = React.useCallback((url) => {
        setTimeout(() => {
            onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));
        }, 0);
    }, [onUnhandledLinking, prefixes]);
`;

    if (source.includes(anchor)) {
      source = source.replace(anchor, replacement);
    }
  }

  source = source.replace(
    `                            onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));
`,
    `                            scheduleUnhandledLinking(url);
`,
  );

  source = source.replace(
    `                    onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));
`,
    `                    scheduleUnhandledLinking(url);
`,
  );

  source = source.replace(
    `    }, [getStateFromURL, onUnhandledLinking, prefixes]);
`,
    `    }, [getStateFromURL, scheduleUnhandledLinking]);
`,
  );

  if (source !== original) {
    fs.writeFileSync(useLinkingPath, source);
    console.log("Patched expo-router initial linking side effect.");
  }
}

// 2. Patch LinkPreviewNativeActionView.swift (iOS 16 UIAction.subtitle availability guard)
const linkPreviewActionViewPath = path.join(
  packageRoot,
  "node_modules",
  "expo-router",
  "ios",
  "LinkPreview",
  "LinkPreviewNativeActionView.swift",
);

if (fs.existsSync(linkPreviewActionViewPath)) {
  let swiftSource = fs.readFileSync(linkPreviewActionViewPath, "utf8");
  const originalSwift = swiftSource;

  const targetSubtitleBlock = `    if let subtitle = subtitle {
      baseUiAction.subtitle = subtitle
    }`;

  const replacementSubtitleBlock = `    if #available(iOS 16.0, *) {
      if let subtitle = subtitle {
        baseUiAction.subtitle = subtitle
      }
    }`;

  if (swiftSource.includes(targetSubtitleBlock)) {
    swiftSource = swiftSource.replace(targetSubtitleBlock, replacementSubtitleBlock);
  }

  if (swiftSource !== originalSwift) {
    fs.writeFileSync(linkPreviewActionViewPath, swiftSource);
    console.log("Patched expo-router LinkPreviewNativeActionView.swift for iOS 16 subtitle availability.");
  }
}
