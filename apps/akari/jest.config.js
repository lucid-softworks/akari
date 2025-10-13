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
  moduleNameMapper: {
    '^@/bluesky-api$': '<rootDir>/../../packages/bluesky-api/src',
    '^@/clearsky-api$': '<rootDir>/../../packages/clearsky-api/src/api',
    '^@/libretranslate-api$': '<rootDir>/../../packages/libretranslate-api/src',
    '^@/tenor-api$': '<rootDir>/../../packages/tenor-api/src',
  },
  ...(isGithubActions ? { reporters: ['default', 'github-actions'] } : {}),
};
