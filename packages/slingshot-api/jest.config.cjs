const isGithubActions = Boolean(process.env.GITHUB_ACTIONS);

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  // This package has no tests yet; don't fail the (workspaces-wide) test run.
  passWithNoTests: true,
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.m?tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      },
    ],
    'node_modules/until-async/.*\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
        },
      },
    ],
    'node_modules/.+\\.mjs$': '<rootDir>/../../scripts/jest-transform-mjs.cjs',
  },
  transformIgnorePatterns: ['node_modules/(?!until-async/|.+\\.mjs$)'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  ...(isGithubActions ? { reporters: ['default', 'github-actions'] } : {}),
};
