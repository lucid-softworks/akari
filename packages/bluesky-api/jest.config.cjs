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
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: jestTsconfig,
    },
  },
  ...(isGithubActions ? { reporters: ['default', 'github-actions'] } : {}),
};
