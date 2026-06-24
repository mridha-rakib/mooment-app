const { getDefaultConfig } = require('expo/metro-config');
const os = require('node:os');

class MemoryCacheStore {
  constructor() {
    this.cache = new Map();
  }

  async get(key) {
    return this.cache.get(key.toString('hex')) ?? null;
  }

  async set(key, value) {
    this.cache.set(key.toString('hex'), value);
  }

  clear() {
    this.cache.clear();
  }
}

const config = getDefaultConfig(__dirname);

// Support for ESM (HugeIcons uses .js extensions in its ESM build which Metro sometimes struggles with)
config.resolver.sourceExts.push('mjs');

if (process.env.NODE_ENV === 'production') {
  // APK bundling is a one-shot production task. Use the default persistent Metro
  // cache and the available CPU cores so repeated release builds can reuse work.
  config.maxWorkers = Math.max(2, Math.min(8, os.availableParallelism() - 1));
} else {
  // Windows can hit EMFILE while Metro reads many small file-cache entries during HMR.
  // Keep the development cache in memory to avoid exhausting file handles.
  config.maxWorkers = 1;
  config.cacheStores = [new MemoryCacheStore()];
}

module.exports = config;
