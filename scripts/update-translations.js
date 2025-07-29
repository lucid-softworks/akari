#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const translationsDir = path.join(process.cwd(), "translations");

// Get all translation files
function getTranslationFiles() {
  return fs
    .readdirSync(translationsDir)
    .filter((file) => file.endsWith(".json") && file !== "en.json")
    .map((file) => file.replace(".json", ""));
}

// Read a translation file
function readTranslationFile(lang) {
  const filePath = path.join(translationsDir, `${lang}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Write a translation file
function writeTranslationFile(lang, content) {
  const filePath = path.join(translationsDir, `${lang}.json`);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf8");
}

// Get available sections from English file
function getAvailableSections() {
  const enContent = readTranslationFile("en");
  return Object.keys(enContent.translations || {});
}

// Get existing keys from a section
function getSectionKeys(sectionName) {
  const enContent = readTranslationFile("en");
  return enContent.translations && enContent.translations[sectionName]
    ? Object.keys(enContent.translations[sectionName])
    : [];
}

// Find similar sections
function findSimilarSections(input, sections) {
  return sections.filter(
    (section) =>
      section.includes(input.toLowerCase()) ||
      input.toLowerCase().includes(section)
  );
}

// Add new section to all translation files
function addNewSection(sectionName) {
  const languages = ["en", ...getTranslationFiles()];

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

// Add key to section in all translation files
function addKeyToSection(sectionName, key, translations) {
  const languages = ["en", ...getTranslationFiles()];

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
    content.translations[sectionName][key] =
      translations[lang] || translations["en"] || "";

    writeTranslationFile(lang, content);
  });

  console.log(`✅ Added key "${key}" to ${sectionName} section`);
}

// Add key to section in a specific language file only
function addKeyToLanguageSection(language, sectionName, key, value) {
  let content = readTranslationFile(language);

  // Ensure translations object exists
  if (!content.translations) {
    content.translations = {};
  }

  // Ensure section exists under translations
  if (!content.translations[sectionName]) {
    content.translations[sectionName] = {};
  }

  // Add the key
  content.translations[sectionName][key] = value;

  writeTranslationFile(language, content);
  console.log(
    `✅ Added key "${key}" to ${sectionName} section for ${language}`
  );
}

// Get language metadata (name, native name, flag) from translation files
function getLanguageMetadata() {
  const metadata = {};
  const languages = ["en", ...getTranslationFiles()];

  languages.forEach((lang) => {
    const content = readTranslationFile(lang);
    metadata[lang] = {
      name: content.language,
      nativeName: content.nativeName,
      flag: content.flag,
    };
  });

  return metadata;
}

// Non-interactive function to update translation keys
function updateTranslationKeysNonInteractive(language, keyPath, value) {
  try {
    // Parse the key path (e.g., "common.abc" -> section: "common", key: "abc")
    const keyParts = keyPath.split(".");
    if (keyParts.length !== 2) {
      console.error("❌ Key must be in format: section.key (e.g., common.abc)");
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

    // Update the key for the specified language (will override if exists)
    addKeyToLanguageSection(language, sectionName, key, value);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Main CLI function
async function main() {
  // Check for command line arguments
  const args = process.argv.slice(2);

  // Parse command line arguments
  let language = null;
  let keyPath = null;
  let value = null;

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (arg.startsWith("--language=")) {
      language = arg.split("=")[1];
    } else if (arg.startsWith("--key=")) {
      keyPath = arg.split("=")[1];
    } else if (arg.startsWith("--value=")) {
      // Handle quoted values by removing surrounding quotes
      value = arg.split("=")[1];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
    }
  }

  if (language && keyPath && value) {
    // Non-interactive mode
    updateTranslationKeysNonInteractive(language, keyPath, value);
    return;
  }

  // Interactive mode (original functionality)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log("🌍 Translation Manager\n");
  console.log(
    "Usage: npm run update-translations --language=en --key=common.abc --value=abc"
  );
  console.log("Or run without arguments for interactive mode.\n");

  try {
    // Get section
    const sections = getAvailableSections();
    let sectionName = await question("Section? ");

    // Check if section exists
    if (!sections.includes(sectionName.toLowerCase())) {
      const similar = findSimilarSections(sectionName, sections);

      if (similar.length > 0) {
        console.log(`\nDid you mean: ${similar.join(", ")}?`);
        const answer = await question("(y/n): ");

        if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
          console.log(
            "Please run the command again with the correct section name."
          );
          rl.close();
          return;
        }
      }

      // Create new section
      console.log(`\nCreating new section: ${sectionName}`);
      addNewSection(sectionName);
    }

    sectionName = sectionName.toLowerCase();

    // Get key
    const existingKeys = getSectionKeys(sectionName);
    const key = await question("Key? ");

    // Check if key exists
    if (existingKeys.includes(key)) {
      console.log(`❌ Key "${key}" already exists in ${sectionName}`);
      rl.close();
      return;
    }

    // Get English value
    const englishValue = await question("Value? ");

    if (!englishValue.trim()) {
      console.log("❌ Value cannot be empty");
      rl.close();
      return;
    }

    // Add to English first
    const translations = { en: englishValue };
    addKeyToSection(sectionName, key, translations);

    // Ask for other languages
    const addOthers = await question(
      "\nAdd translations for other languages? (y/n): "
    );

    if (addOthers.toLowerCase() === "y" || addOthers.toLowerCase() === "yes") {
      const languages = getTranslationFiles();
      const metadata = getLanguageMetadata();

      console.log("\nAvailable languages:");
      languages.forEach((lang, index) => {
        const meta = metadata[lang] || {
          name: lang,
          nativeName: lang,
          flag: "🏳️",
        };
        console.log(
          `${index + 1}. ${meta.flag} ${meta.nativeName} (${meta.name})`
        );
      });

      const langIndex = await question("\nSelect language (number): ");
      const selectedLang = languages[parseInt(langIndex) - 1];

      if (selectedLang) {
        const meta = metadata[selectedLang] || {
          name: selectedLang,
          nativeName: selectedLang,
          flag: "🏳️",
        };
        const value = await question(`${meta.flag} ${meta.nativeName} value: `);

        if (value.trim()) {
          translations[selectedLang] = value;
          addKeyToSection(sectionName, key, translations);
        }
      }
    }

    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    rl.close();
  }
}

// Run the script
main();
