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

// Function to validate translation file structure
function validateTranslationFile(filePath, referenceKeys) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const translation = JSON.parse(content);

    const fileKeys = getAllKeys(translation);
    const fileKeySet = new Set(fileKeys);
    const referenceKeySet = new Set(referenceKeys);
    const missingKeys = [];
    const extraKeys = [];

    // Check for missing keys
    for (const refKey of referenceKeys) {
      if (!fileKeySet.has(refKey)) {
        missingKeys.push(refKey);
      }
    }

    // Check for extra keys
    for (const fileKey of fileKeys) {
      if (!referenceKeySet.has(fileKey)) {
        extraKeys.push(fileKey);
      }
    }

    return {
      filePath,
      isValid: missingKeys.length === 0 && extraKeys.length === 0,
      missingKeys,
      extraKeys,
    };
  } catch (error) {
    return {
      filePath,
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
  const referenceFile = path.join(translationsDir, "en.json");

  // Check if reference file exists
  if (!fs.existsSync(referenceFile)) {
    console.error("❌ Reference file en.json not found!");
    process.exit(1);
  }

  // Load reference file
  let referenceTranslation;
  try {
    const referenceContent = fs.readFileSync(referenceFile, "utf8");
    referenceTranslation = JSON.parse(referenceContent);
  } catch (error) {
    console.error("❌ Error parsing reference file en.json:", error.message);
    process.exit(1);
  }

  // Get all keys from reference file
  const referenceKeys = getAllKeys(referenceTranslation);
  console.log(`📋 Reference file has ${referenceKeys.length} keys`);

  // Get all JSON files in translations directory
  const files = fs
    .readdirSync(translationsDir)
    .flatMap((file) =>
      file.endsWith(".json") && file !== "en.json"
        ? [path.join(translationsDir, file)]
        : [],
    );

  if (files.length === 0) {
    console.log("ℹ️  No translation files found to validate");
    return;
  }

  console.log(`🔍 Validating ${files.length} translation files...\n`);

  let allValid = true;
  const results = [];

  // Validate each file
  for (const file of files) {
    const result = validateTranslationFile(file, referenceKeys);
    results.push(result);

    if (!result.isValid) {
      allValid = false;
    }
  }

  // Display results
  for (const result of results) {
    const fileName = path.basename(result.filePath);

    if (result.error) {
      console.log(`❌ ${fileName}: Parse error - ${result.error}`);
    } else if (result.isValid) {
      console.log(`✅ ${fileName}: Valid`);
    } else {
      console.log(`❌ ${fileName}: Invalid`);

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
  console.log(`   Total files: ${results.length}`);
  console.log(`   Valid: ${validCount}`);
  console.log(`   Invalid: ${invalidCount}`);

  if (allValid) {
    console.log("\n🎉 All translation files are valid!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some translation files have issues. Please fix them.");
    process.exit(1);
  }
}

// Run the script
main();
