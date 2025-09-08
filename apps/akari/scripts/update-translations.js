#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const translationsDir = path.join(process.cwd(), 'translations');

// Get all translation files
function getTranslationFiles() {
  return fs
    .readdirSync(translationsDir)
    .filter((file) => file.endsWith('.json') && file !== 'en.json')
    .map((file) => file.replace('.json', ''));
}

// Get all translation files including English
function getAllTranslationFiles() {
  return fs
    .readdirSync(translationsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''));
}

// Read a translation file
function readTranslationFile(lang) {
  const filePath = path.join(translationsDir, `${lang}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Write a translation file
function writeTranslationFile(lang, content) {
  const filePath = path.join(translationsDir, `${lang}.json`);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
}

// Get available sections from English file
function getAvailableSections() {
  const enContent = readTranslationFile('en');
  return Object.keys(enContent.translations || {});
}

// Add new section to all translation files
function addNewSection(sectionName) {
  const languages = getAllTranslationFiles();

  languages.forEach((lang) => {
    let content = readTranslationFile(lang);

    // Ensure translations object exists
    if (!content.translations) {
      content.translations = {};
    }

    // Add the new section
    content.translations[sectionName] = {};

    writeTranslationFile(lang, content);
  });

  console.log(`✅ Created new section: ${sectionName}`);
}

// Add key to section in specific language files only
function addKeyToSpecificLanguages(sectionName, key, translations, targetLanguages) {
  const languages = targetLanguages || getTranslationFiles();

  languages.forEach((lang) => {
    let content = readTranslationFile(lang);

    // Ensure translations object exists
    if (!content.translations) {
      content.translations = {};
    }

    // Ensure section exists
    if (!content.translations[sectionName]) {
      content.translations[sectionName] = {};
    }

    // Add the key
    content.translations[sectionName][key] = translations[lang] || translations['en'] || '';

    writeTranslationFile(lang, content);
  });

  console.log(`✅ Added key "${key}" to ${sectionName} section for ${languages.join(', ')}`);
}

// Bulk add multiple keys to a section for a specific language
function bulkAddKeysToSection(sectionName, keys, targetLanguage) {
  console.log(`🚀 Bulk adding ${Object.keys(keys).length} keys to ${sectionName} section for ${targetLanguage}...`);

  let content = readTranslationFile(targetLanguage);
  let addedCount = 0;

  // Ensure translations object exists
  if (!content.translations) {
    content.translations = {};
  }

  // Ensure section exists
  if (!content.translations[sectionName]) {
    content.translations[sectionName] = {};
  }

  // Add each key
  Object.entries(keys).forEach(([key, value]) => {
    if (!content.translations[sectionName][key]) {
      content.translations[sectionName][key] = value;
      addedCount++;
    }
  });

  if (addedCount > 0) {
    writeTranslationFile(targetLanguage, content);
    console.log(`  ✅ Added ${addedCount} keys to ${targetLanguage}.json`);
  } else {
    console.log(`  ℹ️  No new keys to add to ${targetLanguage}.json`);
  }
}

// Non-interactive function to update translation keys
function updateTranslationKeysNonInteractive(language, keyPath, value) {
  try {
    // Parse the key path (e.g., "common.abc" -> section: "common", key: "abc")
    const keyParts = keyPath.split('.');
    if (keyParts.length !== 2) {
      console.error('❌ Key must be in format: section.key (e.g., common.abc)');
      return;
    }

    let [sectionName, key] = keyParts;
    const sections = getAvailableSections();
    sectionName = sectionName.toLowerCase();

    // Check if section exists
    if (!sections.includes(sectionName)) {
      console.log(`Creating new section: ${sectionName}`);
      addNewSection(sectionName);
    }

    // Update the key for the specified language
    const translations = { [language]: value };
    addKeyToSpecificLanguages(sectionName, key, translations, [language]);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      // Handle --key=value format
      if (arg.includes('=')) {
        const [key, value] = arg.slice(2).split('=');
        options[key] = value;
      } else {
        // Handle --key value format
        const key = arg.slice(2);
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
          options[key] = value;
          i++; // Skip the value in next iteration
        } else {
          options[key] = true;
        }
      }
    }
  }

  return options;
}

// Main CLI function
function main() {
  const options = parseArgs();

  // Show help
  if (options.help || options.h) {
    console.log('🌍 Translation Manager - Bulk Update Script');
    console.log('\nUsage:');
    console.log('  npm run update-translations -- --help');
    console.log('  npm run update-translations -- --language=en --key=post.newPost --value="New Post"');
    console.log(
      '  npm run update-translations -- --language=fr --bulk-add --section=post --keys={"newPost":"Nouveau Post","reply":"Répondre"}',
    );
    console.log('  npm run update-translations -- --languages=fr,de,es --section=post --key=newPost --value="New Post"');
    console.log('\nOptions:');
    console.log('  --help, -h                    Show this help message');
    console.log('  --language                    Target language for single key update or bulk add');
    console.log('  --key                         Key path in format section.key');
    console.log('  --value                       Value for the key');
    console.log('  --bulk-add                    Bulk add multiple keys to a section for a specific language');
    console.log('  --section                     Section name for bulk operations');
    console.log('  --keys                        JSON object of key-value pairs for bulk add');
    console.log('  --languages                   Comma-separated list of target languages');
    return;
  }

  // Bulk add keys to a section for a specific language
  if (options['bulk-add'] && options.language && options.section && options.keys) {
    try {
      const keys = JSON.parse(options.keys);
      bulkAddKeysToSection(options.section, keys, options.language);
    } catch (error) {
      console.error('❌ Error parsing keys JSON:', error.message);
    }
    return;
  }

  // Single key update
  if (options.language && options.key && options.value) {
    updateTranslationKeysNonInteractive(options.language, options.key, options.value);
    return;
  }

  // Multiple languages update
  if (options.languages && options.section && options.key && options.value) {
    const targetLanguages = options.languages.split(',');
    const keyParts = options.key.split('.');

    if (keyParts.length !== 2) {
      console.error('❌ Key must be in format: section.key');
      return;
    }

    const [sectionName, key] = keyParts;
    const translations = { en: options.value };

    // Add to all target languages
    addKeyToSpecificLanguages(sectionName, key, translations, targetLanguages);
    return;
  }

  // No valid options provided
  console.log('❌ No valid options provided. Use --help for usage information.');
}

// Run the script
main();
