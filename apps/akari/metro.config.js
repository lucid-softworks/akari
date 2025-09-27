const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

// Add path mapping for the internal packages
config.resolver.alias = {
  '@/bluesky-api': path.resolve(__dirname, '../../packages/bluesky-api'),
  '@/libretranslate-api': path.resolve(__dirname, '../../packages/libretranslate-api'),
  '@/tenor-api': path.resolve(__dirname, '../../packages/tenor-api'),
};

module.exports = config;
