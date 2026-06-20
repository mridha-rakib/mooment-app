const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const specsDirs = [
  path.join(packageRoot, "node_modules", "@rnmapbox", "maps", "src", "specs"),
  path.join(packageRoot, "node_modules", "@rnmapbox", "maps", "lib", "module", "specs"),
];

const codegenTypesPath = "react-native/Libraries/Types/CodegenTypes";
const importPattern = new RegExp(
  String.raw`import\s+(?!type\b)\{([^;]*?)\}\s+from ['"]${codegenTypesPath.replace(/\//g, String.raw`\/`)}['"];`,
  "g",
);

let changedFiles = 0;

for (const specsDir of specsDirs) {
  if (!fs.existsSync(specsDir)) {
    continue;
  }

  for (const entry of fs.readdirSync(specsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    const filePath = path.join(specsDir, entry.name);
    const source = fs.readFileSync(filePath, "utf8");
    const patched = source.replace(
      importPattern,
      (_match, imports) => `import type {${imports}} from '${codegenTypesPath}';`,
    );

    if (patched !== source) {
      fs.writeFileSync(filePath, patched);
      changedFiles += 1;
    }
  }
}

if (changedFiles > 0) {
  console.log(`Patched @rnmapbox/maps CodegenTypes imports in ${changedFiles} files.`);
}
