const HUGEICONS_PACKAGE = "@hugeicons/core-free-icons";

// A few public export names are aliases whose backing file has a different name.
const hugeiconsFileAliases = {
  ChevronLeft: "ArrowLeft01Icon",
  ChevronRight: "ArrowRight01Icon",
};

function transformHugeiconsImports({ types: t }) {
  return {
    name: "transform-hugeicons-imports",
    visitor: {
      ImportDeclaration(path) {
        if (path.node.source.value !== HUGEICONS_PACKAGE) {
          return;
        }

        const directImports = [];
        const remainingSpecifiers = [];

        for (const specifier of path.node.specifiers) {
          if (!t.isImportSpecifier(specifier)) {
            remainingSpecifiers.push(specifier);
            continue;
          }

          const importedName = specifier.imported.name || specifier.imported.value;
          const fileName = hugeiconsFileAliases[importedName] || importedName;

          directImports.push(
            t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier(specifier.local.name))],
              t.stringLiteral(`${HUGEICONS_PACKAGE}/${fileName}`)
            )
          );
        }

        if (remainingSpecifiers.length > 0) {
          directImports.unshift(t.importDeclaration(remainingSpecifiers, t.stringLiteral(HUGEICONS_PACKAGE)));
        }

        path.replaceWithMultiple(directImports);
      },
    },
  };
}

module.exports = function configureBabel(api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [transformHugeiconsImports],
  };
};
