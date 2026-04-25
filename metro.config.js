const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support for ESM (HugeIcons uses .js extensions in its ESM build which Metro sometimes struggles with)
config.resolver.sourceExts.push('mjs');

module.exports = config;
