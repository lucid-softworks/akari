const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add path mapping for the internal packages and fix external packages shipping raw TS
config.resolver.alias = {
  '@keytrace/claims': path.resolve(__dirname, '../../node_modules/@keytrace/claims/dist/verify.js'),
  '@/axiom-crash-reporter': path.resolve(__dirname, '../../packages/axiom-crash-reporter'),
  '@/bluesky-api': path.resolve(__dirname, '../../packages/bluesky-api'),
  '@/libretranslate-api': path.resolve(__dirname, '../../packages/libretranslate-api'),
  '@/tenor-api': path.resolve(__dirname, '../../packages/tenor-api'),
  '@/tmdb-api': path.resolve(__dirname, '../../packages/tmdb-api'),
};

module.exports = config;
