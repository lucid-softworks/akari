module.exports = {
  preset: 'jest-expo',
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
    '^@/bluesky-api$': '<rootDir>/../../packages/bluesky-api/dist',
    '^@/clearsky-api$': '<rootDir>/../../packages/clearsky-api/dist',
  },
};
