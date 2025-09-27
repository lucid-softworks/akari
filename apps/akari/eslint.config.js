// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const unicorn = require('eslint-plugin-unicorn').default;

module.exports = defineConfig([
  expoConfig,
  {
    ...unicorn.configs['flat/recommended'],
    files: ['scripts/**/*.{cjs,js,ts}', 'metro.config.js'],
  },
  {
    ignores: ['dist/*'],
    plugins: {
      unicorn,
    },
    rules: {
      'unicorn/prefer-ternary': ['error', 'only-single-line'],
    },
  },
]);
