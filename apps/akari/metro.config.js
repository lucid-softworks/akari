const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add path mapping for the bluesky-api package
config.resolver.alias = {
  '@/bluesky-api': path.resolve(__dirname, '../../packages/bluesky-api'),
};

module.exports = config;
