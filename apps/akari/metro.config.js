const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add path mapping for the internal packages
config.resolver.alias = {
  '@/clearsky-api': path.resolve(__dirname, '../../packages/clearsky-api'),
  '@/bluesky-api': path.resolve(__dirname, '../../packages/bluesky-api'),
  '@/tenor-api': path.resolve(__dirname, '../../packages/tenor-api'),
};

module.exports = config;
