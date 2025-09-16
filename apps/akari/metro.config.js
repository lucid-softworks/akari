const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add path mapping for the internal packages
const clearskyPackageRoot = path.resolve(__dirname, '../../packages/clearsky-api');
const clearskyDistEntry = path.join(clearskyPackageRoot, 'dist/api.js');

if (!fs.existsSync(clearskyDistEntry)) {
  throw new Error(
    'ClearSky API build output not found. Run "npm --workspace clearsky-api run build" before bundling.',
  );
}

config.resolver.alias = {
  ...(config.resolver.alias ?? {}),
  '@/clearsky-api': clearskyDistEntry,
  '@/bluesky-api': path.resolve(__dirname, '../../packages/bluesky-api'),
  '@/tenor-api': path.resolve(__dirname, '../../packages/tenor-api'),
};

module.exports = config;
