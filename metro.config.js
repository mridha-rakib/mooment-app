const { getDefaultConfig } = require('expo/metro-config');
const os = require('node:os');
const path = require('node:path');

class MemoryCacheStore {
  constructor(maxEntries = 256) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
  }

  async get(key) {
    const cacheKey = key.toString('hex');
    const value = this.cache.get(cacheKey);

    if (value === undefined) {
      return null;
    }

    // Refresh the entry so the Map also acts as a small LRU cache.
    this.cache.delete(cacheKey);
    this.cache.set(cacheKey, value);

    return value;
  }

  async set(key, value) {
    const cacheKey = key.toString('hex');

    this.cache.delete(cacheKey);
    this.cache.set(cacheKey, value);

    while (this.cache.size > this.maxEntries) {
      this.cache.delete(this.cache.keys().next().value);
    }
  }

  clear() {
    this.cache.clear();
  }
}

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;
const hugeiconsPrefix = '@hugeicons/core-free-icons/';

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(hugeiconsPrefix)) {
    const iconName = moduleName.slice(hugeiconsPrefix.length);

    if (/^[A-Za-z0-9]+$/.test(iconName)) {
      return {
        type: 'sourceFile',
        filePath: path.join(
          __dirname,
          'node_modules',
          '@hugeicons',
          'core-free-icons',
          'dist',
          'esm',
          `${iconName}.js`
        ),
      };
    }
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// Support for ESM (HugeIcons uses .js extensions in its ESM build which Metro sometimes struggles with)
config.resolver.sourceExts.push('mjs');

if (process.env.NODE_ENV === 'production') {
  // APK bundling is a one-shot production task. Use the default persistent Metro
  // cache and the available CPU cores so repeated release builds can reuse work.
  config.maxWorkers = Math.max(2, Math.min(8, os.availableParallelism() - 1));
} else {
  // Windows can hit EMFILE while Metro reads many small file-cache entries during HMR.
  // Keep a bounded development cache in memory to avoid exhausting file handles
  // without retaining every transformed module for the lifetime of Metro.
  config.maxWorkers = 1;
  config.cacheStores = [new MemoryCacheStore()];
}

module.exports = config;
