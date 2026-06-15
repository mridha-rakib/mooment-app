const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempDir = os.tmpdir();
const projectRoot = path.resolve(__dirname, "..");

const targets = [
  path.join(tempDir, "metro-cache"),
  path.join(tempDir, "metro-file-map-*"),
  path.join(tempDir, "haste-map-metro-*"),
  path.join(projectRoot, ".metro-cache"),
  path.join(projectRoot, ".expo", "web", "cache"),
];

function removeTarget(target) {
  const parent = path.dirname(target);
  const name = path.basename(target);
  const hasWildcard = name.includes("*");

  if (!fs.existsSync(parent)) {
    return;
  }

  const entries = hasWildcard
    ? fs.readdirSync(parent).filter((entry) => {
        const prefix = name.slice(0, name.indexOf("*"));
        const suffix = name.slice(name.indexOf("*") + 1);
        return entry.startsWith(prefix) && entry.endsWith(suffix);
      })
    : [name];

  for (const entry of entries) {
    const fullPath = path.join(parent, entry);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    try {
      fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      console.log(`Removed ${fullPath}`);
    } catch (error) {
      console.warn(`Could not fully remove ${fullPath}: ${error.code || error.message}`);
    }
  }
}

for (const target of targets) {
  removeTarget(target);
}
