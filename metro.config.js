const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support for ESM (HugeIcons uses .js extensions in its ESM build which Metro sometimes struggles with)
config.resolver.sourceExts.push('mjs');

// Windows can hit EMFILE while Metro transforms many modules and reads cache files concurrently.
// Keep this scoped to Metro worker concurrency; it does not change bundling output or app behavior.
config.maxWorkers = 2;

module.exports = config;
