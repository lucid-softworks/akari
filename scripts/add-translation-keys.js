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
  return Object.keys(enContent);
}

// Get existing keys from a section
function getSectionKeys(sectionName) {
  const enContent = readTranslationFile("en");
  return enContent[sectionName] ? Object.keys(enContent[sectionName]) : [];
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

    // Add the new section
    content[sectionName] = {};

    writeTranslationFile(lang, content);
  });

  console.log(`✅ Created new section: ${sectionName}`);
}

// Add key to section in all translation files
function addKeyToSection(sectionName, key, translations) {
  const languages = ["en", ...getTranslationFiles()];

  languages.forEach((lang) => {
    let content = readTranslationFile(lang);

    // Ensure section exists
    if (!content[sectionName]) {
      content[sectionName] = {};
    }

    // Add the key
    content[sectionName][key] = translations[lang] || translations["en"] || "";

    writeTranslationFile(lang, content);
  });

  console.log(`✅ Added key "${key}" to ${sectionName} section`);
}

// Get language metadata (name, native name, flag)
function getLanguageMetadata() {
  // This will be moved to translation files later, but for now hardcode
  return {
    en: { name: "English", nativeName: "English", flag: "🇬🇧" },
    "en-US": {
      name: "English (US)",
      nativeName: "English (Simplified)",
      flag: "🇺🇸",
    },
    es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
    fr: { name: "French", nativeName: "Français", flag: "🇫🇷" },
    de: { name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
    it: { name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
    pt: { name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
    ja: { name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
    ko: { name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
    "zh-CN": {
      name: "Chinese (Simplified)",
      nativeName: "简体中文",
      flag: "🇨🇳",
    },
    "zh-TW": {
      name: "Chinese (Traditional)",
      nativeName: "繁體中文",
      flag: "🇹🇼",
    },
    ar: { name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
    ru: { name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
    hi: { name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
    id: { name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
    tr: { name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
    nl: { name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
    pl: { name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
    vi: { name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
    th: { name: "Thai", nativeName: "ไทย", flag: "🇹🇭" },
  };
}

// Main CLI function
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log("🌍 Translation Manager\n");

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
