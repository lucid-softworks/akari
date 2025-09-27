const isGithubActions = Boolean(process.env.GITHUB_ACTIONS);

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: './tsconfig.json',
    },
  },
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  ...(isGithubActions ? { reporters: ['default', 'github-actions'] } : {}),
};
