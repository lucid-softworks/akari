import { getTranslationReport } from "./translationLogger";

/**
 * Development utility to check for missing translations
 * Call this function in development to get a report of missing translations
 */
export const checkMissingTranslations = () => {
  if (__DEV__) {
    const report = getTranslationReport();
    console.log("📊 Translation Report:");
    console.log(report);
    return report;
  } else {
    console.log("Translation checking is only available in development mode.");
    return null;
  }
};

/**
 * Development utility to log all available translation keys
 * Useful for debugging and ensuring all keys are properly defined
 */
export const logAvailableTranslationKeys = () => {
  if (__DEV__) {
    // This would require importing the translations object
    // For now, just log a message
    console.log(
      "🔍 To see all available translation keys, check utils/i18n.ts"
    );
  }
};
