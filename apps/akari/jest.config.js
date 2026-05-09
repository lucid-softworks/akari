const isGithubActions = Boolean(process.env.GITHUB_ACTIONS);

module.exports = {
  preset: 'jest-expo',
  setupFiles: [require.resolve('jest-expo/src/preset/setup.js'), '<rootDir>/jest.setup.early.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/__tests__/**',
    '!**/dist/**',
    '!**/.expo/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  // The default jest-expo `transformIgnorePatterns` skips most of
  // node_modules. `@noble/*` v2 ships ESM that babel-jest needs to transform,
  // so allow-list them here.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@noble/curves|@noble/hashes|@atcute/.*))',
  ],
  moduleNameMapper: {
    '^@/axiom-crash-reporter$': '<rootDir>/../../packages/axiom-crash-reporter/src',
    '^@/bluesky-api$': '<rootDir>/../../packages/bluesky-api/src',
    '^@/clearsky-api$': '<rootDir>/../../packages/clearsky-api/src/api',
    '^@/constellation-api$': '<rootDir>/../../packages/constellation-api/src',
    '^@/libretranslate-api$': '<rootDir>/../../packages/libretranslate-api/src',
    '^@/tenor-api$': '<rootDir>/../../packages/tenor-api/src',
    '^@/tmdb-api$': '<rootDir>/../../packages/tmdb-api/src',
    // react-native-webrtc is a native-only module that tests can't
    // load; the WebRTC stream player only mounts on real devices.
    '^react-native-webrtc$': '<rootDir>/__mocks__/react-native-webrtc.js',
  },
  ...(isGithubActions ? { reporters: ['default', 'github-actions'] } : {}),
};
