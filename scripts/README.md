# Scripts

This directory contains utility scripts for the Akari v2 project.

## Available Scripts

### `reset-project.js`

Resets the project to a clean state by removing generated files and dependencies.

**Usage:**

```bash
npm run reset-project
```

### `add-translation-keys.js`

Adds missing translation keys to all language files based on the English translation file.

**Usage:**

```bash
npm run add-translations
```

### `validate-translations.js`

Validates all translation files to ensure they match the exact structure of the English translation file (`en.json`). This script:

- Checks for missing keys in other language files
- Identifies extra keys that don't exist in the reference file
- Reports JSON parsing errors
- Provides a detailed summary of validation results

**Usage:**

```bash
npm run validate-translations
```

**Output Example:**

```
📋 Reference file has 304 keys
🔍 Validating 20 translation files...

✅ en-US.json: Valid
❌ ar.json: Invalid
   Extra keys (1):
     + translations.common.noTextContent

📊 Summary:
   Total files: 20
   Valid: 1
   Invalid: 19

⚠️  Some translation files have issues. Please fix them.
```

**Exit Codes:**

- `0`: All translation files are valid
- `1`: One or more translation files have issues

## Running Scripts

All scripts can be run using npm:

```bash
npm run <script-name>
```

Or directly with node:

```bash
node scripts/<script-name>.js
```
