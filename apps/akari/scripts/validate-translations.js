#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Function to get all keys from an object recursively
function getAllKeys(obj, prefix = "") {
  const keys = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys.push(...getAllKeys(obj[key], fullKey));
    }
  }

  return keys;
}

// Translations live as one directory per locale, each holding a set of
// per-namespace JSON files (common.json, profile.json, …) that the locale's
// index.ts barrel merges into a single `{ namespace: { …keys } }` object.
// Load a locale by merging those files the same way, keyed by file basename
// (which is exactly the namespace key the barrel exports).
function loadLocale(localeDir) {
  const merged = {};
  const files = fs
    .readdirSync(localeDir)
    .filter((file) => file.endsWith(".json"))
    .toSorted();

  for (const file of files) {
    const namespace = path.basename(file, ".json");
    const content = fs.readFileSync(path.join(localeDir, file), "utf8");
    merged[namespace] = JSON.parse(content);
  }

  return merged;
}

// Validate a single locale directory against the reference key set.
function validateLocale(locale, localeDir, referenceKeys) {
  try {
    const translation = loadLocale(localeDir);

    const fileKeys = getAllKeys(translation);
    const fileKeySet = new Set(fileKeys);
    const referenceKeySet = new Set(referenceKeys);
    const missingKeys = [];
    const extraKeys = [];

    for (const refKey of referenceKeys) {
      if (!fileKeySet.has(refKey)) {
        missingKeys.push(refKey);
      }
    }

    for (const fileKey of fileKeys) {
      if (!referenceKeySet.has(fileKey)) {
        extraKeys.push(fileKey);
      }
    }

    return {
      locale,
      isValid: missingKeys.length === 0 && extraKeys.length === 0,
      missingKeys,
      extraKeys,
    };
  } catch (error) {
    return {
      locale,
      isValid: false,
      error: error.message,
      missingKeys: [],
      extraKeys: [],
    };
  }
}

// Main function
function main() {
  const translationsDir = path.join(process.cwd(), "translations");
  const referenceLocale = "en";
  const referenceDir = path.join(translationsDir, referenceLocale);

  // Check if reference locale exists
  if (!fs.existsSync(referenceDir) || !fs.statSync(referenceDir).isDirectory()) {
    console.error("❌ Reference locale directory en/ not found!");
    process.exit(1);
  }

  // Load reference locale
  let referenceTranslation;
  try {
    referenceTranslation = loadLocale(referenceDir);
  } catch (error) {
    console.error("❌ Error loading reference locale en:", error.message);
    process.exit(1);
  }

  // Get all keys from reference locale
  const referenceKeys = getAllKeys(referenceTranslation);
  console.log(`📋 Reference locale "${referenceLocale}" has ${referenceKeys.length} keys`);

  // Every other locale is a sibling directory of the reference locale.
  const locales = fs
    .readdirSync(translationsDir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() && entry.name !== referenceLocale ? [entry.name] : [],
    )
    .toSorted();

  if (locales.length === 0) {
    console.log("ℹ️  No locales found to validate");
    return;
  }

  console.log(`🔍 Validating ${locales.length} locales...\n`);

  let allValid = true;
  const results = [];

  // Validate each locale
  for (const locale of locales) {
    const result = validateLocale(locale, path.join(translationsDir, locale), referenceKeys);
    results.push(result);

    if (!result.isValid) {
      allValid = false;
    }
  }

  // Display results
  for (const result of results) {
    if (result.error) {
      console.log(`❌ ${result.locale}: Parse error - ${result.error}`);
    } else if (result.isValid) {
      console.log(`✅ ${result.locale}: Valid`);
    } else {
      console.log(`❌ ${result.locale}: Invalid`);

      if (result.missingKeys.length > 0) {
        console.log(`   Missing keys (${result.missingKeys.length}):`);
        result.missingKeys.forEach((key) => console.log(`     - ${key}`));
      }

      if (result.extraKeys.length > 0) {
        console.log(`   Extra keys (${result.extraKeys.length}):`);
        result.extraKeys.forEach((key) => console.log(`     + ${key}`));
      }
    }
    console.log("");
  }

  // Summary
  const validCount = results.filter((r) => r.isValid).length;
  const invalidCount = results.length - validCount;

  console.log("📊 Summary:");
  console.log(`   Total locales: ${results.length}`);
  console.log(`   Valid: ${validCount}`);
  console.log(`   Invalid: ${invalidCount}`);

  if (allValid) {
    console.log("\n🎉 All locales are valid!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some locales have issues. Please fix them.");
    process.exit(1);
  }
}

// Run the script
main();
