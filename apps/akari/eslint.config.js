const i18next = require('eslint-plugin-i18next');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  i18next.configs['flat/recommended'],
  {
    ignores: ['dist/*'],
  },
]);
