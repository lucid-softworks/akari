const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add path mapping for the internal packages
config.resolver.alias = {
  '@/axiom-crash-reporter': path.resolve(__dirname, '../../packages/axiom-crash-reporter'),
  '@/bluesky-api': path.resolve(__dirname, '../../packages/bluesky-api'),
  '@/libretranslate-api': path.resolve(__dirname, '../../packages/libretranslate-api'),
  '@/tenor-api': path.resolve(__dirname, '../../packages/tenor-api'),
};

module.exports = config;
