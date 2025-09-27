const baseTsconfig = require('./tsconfig.json');

const jestTsconfig = {
  ...baseTsconfig.compilerOptions,
  types: [
    ...new Set([
      ...(baseTsconfig.compilerOptions?.types ?? []),
      'jest',
      'node',
    ]),
  ],
};

const isGithubActions = Boolean(process.env.GITHUB_ACTIONS);

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  coverageProvider: 'v8',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.m?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: jestTsconfig,
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(msw|@mswjs/.*|until-async)/)'],
  ...(isGithubActions ? { reporters: ['default', 'github-actions'] } : {}),
};
