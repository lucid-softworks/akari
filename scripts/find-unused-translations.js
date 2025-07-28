#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Function to recursively extract all nested keys from an object
function extractKeys(obj, prefix = "") {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Recursively extract keys from nested objects
      keys.push(...extractKeys(value, fullKey));
    } else {
      // This is a leaf node (actual translation)
      keys.push(fullKey);
    }
  }

  return keys;
}

// Function to recursively remove keys from an object based on a list of keys to remove
function removeKeysFromObject(obj, keysToRemove, prefix = "") {
  const result = { ...obj };

  for (const [key, value] of Object.entries(result)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Recursively process nested objects
      result[key] = removeKeysFromObject(value, keysToRemove, fullKey);

      // Remove the key if it's empty after processing
      if (Object.keys(result[key]).length === 0) {
        delete result[key];
      }
    } else {
      // This is a leaf node - remove if it's in the keysToRemove list
      if (keysToRemove.includes(fullKey)) {
        delete result[key];
      }
    }
  }

  return result;
}

// Function to remove unused translation keys from all translation files
function removeUnusedKeys(unusedKeys) {
  if (unusedKeys.length === 0) {
    console.log("✅ No unused keys to remove.");
    return;
  }

  console.log(`🗑️  Removing ${unusedKeys.length} unused translation keys...`);

  // Get all translation files
  const translationFiles = glob.sync("translations/*.json", {
    cwd: process.cwd(),
    ignore: ["translations/backup/**"],
  });

  let totalRemoved = 0;

  translationFiles.forEach((file) => {
    try {
      const filePath = path.join(process.cwd(), file);
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // Remove unused keys from the translations object
      const cleanedTranslations = removeKeysFromObject(
        content.translations,
        unusedKeys
      );

      // Update the content with cleaned translations
      content.translations = cleanedTranslations;

      // Write the cleaned content back to the file
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");

      // Count how many keys were actually removed from this file
      const originalKeys = extractKeys(content.translations);
      const newKeys = extractKeys(cleanedTranslations);
      const removedFromThisFile = originalKeys.length - newKeys.length;
      totalRemoved += removedFromThisFile;

      console.log(`  📝 ${file}: removed ${removedFromThisFile} keys`);
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error.message);
    }
  });

  console.log(
    `\n✅ Successfully removed ${totalRemoved} unused translation keys from ${translationFiles.length} files.`
  );
}

// Function to check if a key is a storage key or other non-translation string
function isStorageKey(key) {
  // Common storage keys and non-translation strings to ignore
  const storageKeys = [
    "CURRENT_ACCOUNT_ID",
    "JWT_TOKEN",
    "REFRESH_TOKEN",
    "USER_DID",
    "USER_HANDLE",
    "SELECTED_FEED",
    "Switch Account",
    "Error",
    "a",
    "\n",
  ];

  // Check if it's a storage key
  if (storageKeys.includes(key)) {
    return true;
  }

  // Check if it contains only uppercase letters and underscores (likely a constant)
  if (/^[A-Z_]+$/.test(key)) {
    return true;
  }

  // Check if it's a single character or very short string
  if (key.length <= 2) {
    return true;
  }

  return false;
}

// Function to find all translation keys in the en.json file
function getTranslationKeys() {
  try {
    const enJsonPath = path.join(process.cwd(), "translations", "en.json");
    const enJson = JSON.parse(fs.readFileSync(enJsonPath, "utf8"));

    // Extract keys from the translations object
    const translationKeys = extractKeys(enJson.translations);
    return translationKeys;
  } catch (error) {
    console.error("❌ Error reading en.json:", error.message);
    process.exit(1);
  }
}

// Function to search for translation key usage in files
function findTranslationUsage(keys) {
  const usedKeys = new Set();
  const keyUsageCount = {};

  // Get all TypeScript/TSX files
  const files = glob.sync("**/*.{ts,tsx}", {
    cwd: process.cwd(),
    ignore: [
      "node_modules/**",
      "ios/**",
      "android/**",
      "scripts/**",
      "translations/**",
      "*.d.ts",
    ],
  });

  console.log(`🔍 Searching through ${files.length} TypeScript/TSX files...`);

  files.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    const content = fs.readFileSync(filePath, "utf8");

    // Search for t("key") or t('key') patterns
    const tFunctionMatches = content.match(/t\(["']([^"']+)["']/g) || [];
    tFunctionMatches.forEach((match) => {
      const key = match.match(/t\(["']([^"']+)["']/)[1];
      // Filter out storage keys and other non-translation strings
      if (!isStorageKey(key)) {
        usedKeys.add(key);
        keyUsageCount[key] = (keyUsageCount[key] || 0) + 1;
      }
    });

    // Search for translationKey="key" patterns (LocalizedText component)
    const translationKeyMatches =
      content.match(/translationKey=["']([^"']+)["']/g) || [];
    translationKeyMatches.forEach((match) => {
      const key = match.match(/translationKey=["']([^"']+)["']/)[1];
      // Filter out storage keys and other non-translation strings
      if (!isStorageKey(key)) {
        usedKeys.add(key);
        keyUsageCount[key] = (keyUsageCount[key] || 0) + 1;
      }
    });
  });

  return { usedKeys, keyUsageCount };
}

// Function to find unused keys
function findUnusedKeys(allKeys, usedKeys) {
  return allKeys.filter((key) => !usedKeys.has(key));
}

// Function to find keys that are used but don't exist in en.json
function findMissingKeys(usedKeys, allKeys) {
  return Array.from(usedKeys).filter((key) => !allKeys.includes(key));
}

// Function to generate a detailed report
function generateReport(unusedKeys, missingKeys, keyUsageCount, allKeys) {
  let report = "";

  // Summary
  report += `📊 Translation Usage Report\n`;
  report += `========================\n\n`;
  report += `Total keys in en.json: ${allKeys.length}\n`;
  report += `Keys used in codebase: ${Object.keys(keyUsageCount).length}\n`;
  report += `Unused keys: ${unusedKeys.length}\n`;
  report += `Missing keys: ${missingKeys.length}\n\n`;

  // Unused keys
  if (unusedKeys.length > 0) {
    report += `❌ Unused Translation Keys (${unusedKeys.length}):\n`;
    report += `----------------------------------------\n`;
    unusedKeys.sort().forEach((key) => {
      report += `• ${key}\n`;
    });
    report += `\n`;
  } else {
    report += `✅ All translation keys are being used!\n\n`;
  }

  // Missing keys
  if (missingKeys.length > 0) {
    report += `⚠️  Missing Translation Keys (${missingKeys.length}):\n`;
    report += `----------------------------------------\n`;
    missingKeys.sort().forEach((key) => {
      report += `• ${key}\n`;
    });
    report += `\n`;
  }

  // Most used keys
  const sortedUsage = Object.entries(keyUsageCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (sortedUsage.length > 0) {
    report += `🔥 Most Used Translation Keys:\n`;
    report += `-----------------------------\n`;
    sortedUsage.forEach(([key, count]) => {
      report += `• ${key} (${count} times)\n`;
    });
    report += `\n`;
  }

  return report;
}

// Main function
function main() {
  // Check for --remove flag
  const shouldRemove = process.argv.includes("--remove");

  console.log("🔍 Finding unused translation keys...\n");

  // Get all translation keys from en.json
  const allKeys = getTranslationKeys();
  console.log(`📋 Found ${allKeys.length} translation keys in en.json\n`);

  // Find usage in codebase
  const { usedKeys, keyUsageCount } = findTranslationUsage(allKeys);

  // Find unused and missing keys
  const unusedKeys = findUnusedKeys(allKeys, usedKeys);
  const missingKeys = findMissingKeys(usedKeys, allKeys);

  // Generate and display report
  const report = generateReport(
    unusedKeys,
    missingKeys,
    keyUsageCount,
    allKeys
  );
  console.log(report);

  // Remove unused keys if requested
  if (shouldRemove && unusedKeys.length > 0) {
    console.log("\n" + "=".repeat(50));
    removeUnusedKeys(unusedKeys);
    console.log("=".repeat(50) + "\n");
  }

  // Exit with appropriate code
  if (unusedKeys.length > 0 || missingKeys.length > 0) {
    if (shouldRemove) {
      console.log("✅ Cleanup completed!");
      process.exit(0);
    } else {
      console.log(
        "⚠️  Issues found. Consider cleaning up unused keys or adding missing ones."
      );
      console.log("💡 Use --remove flag to automatically remove unused keys.");
      process.exit(1);
    }
  } else {
    console.log("✅ No issues found!");
    process.exit(0);
  }
}

// Run the script
main();
