import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import unicorn from 'eslint-plugin-unicorn';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  js.configs.recommended,
  unicorn.configs['flat/recommended'],
  ...compat.extends('expo'),
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'unicorn/prefer-ternary': ['error', 'only-single-line'],
      'unicorn/no-null': 'off',
    },
  },
];
