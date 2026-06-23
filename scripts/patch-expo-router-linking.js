const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const useLinkingPath = path.join(
  packageRoot,
  "node_modules",
  "expo-router",
  "build",
  "fork",
  "useLinking.native.js",
);

if (!fs.existsSync(useLinkingPath)) {
  process.exit(0);
}

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

  if (!source.includes(anchor)) {
    process.exit(0);
  }

  source = source.replace(anchor, replacement);
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
