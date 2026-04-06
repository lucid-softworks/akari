const path = require('path');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Add path mapping for the internal packages
config.resolver.alias = {
  '@/axiom-crash-reporter': path.resolve(__dirname, '../../packages/axiom-crash-reporter'),
  '@/bluesky-api': path.resolve(__dirname, '../../packages/bluesky-api'),
  '@/libretranslate-api': path.resolve(__dirname, '../../packages/libretranslate-api'),
  '@/tenor-api': path.resolve(__dirname, '../../packages/tenor-api'),
  '@/tmdb-api': path.resolve(__dirname, '../../packages/tmdb-api'),
};

module.exports = config;