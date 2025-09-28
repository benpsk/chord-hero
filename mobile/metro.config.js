// Expo Metro configuration with safe symbolication
// Filters anonymous frames to avoid ENOENT codeframe attempts.

const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

const previousCustomizeFrame = config.symbolicator?.customizeFrame;

config.symbolicator = {
  ...config.symbolicator,
  async customizeFrame(frame) {
    const base = previousCustomizeFrame ? await previousCustomizeFrame(frame) : {};
    if (frame?.file === '<anonymous>') {
      // Collapse anonymous frames so Metro won't attempt a codeframe for them.
      return { ...base, collapse: true };
    }
    return base;
  },
  async customizeStack(stack /*, _extraData */) {
    // Drop anonymous frames entirely from the symbolicated output.
    return stack.filter((f) => f?.file !== '<anonymous>');
  },
};

module.exports = config;

