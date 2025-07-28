import { secureStorageUtils } from "./secureStorage";
import { getTranslationReport } from "./translationLogger";

/**
 * Development utility to clear all MMKV storage data
 * This is useful for testing and debugging
 */
export function clearAllStorage() {
  try {
    secureStorageUtils.clear();
    return true;
  } catch {
    return false;
  }
}

/**
 * Development utility to log current storage state
 */
export function logStorageState() {
  try {
    const allKeys = secureStorageUtils.getAllKeys();
    const accounts = secureStorageUtils.getJSON("ACCOUNTS");
    const currentAccount = secureStorageUtils.get("CURRENT_ACCOUNT_ID");
    const token = secureStorageUtils.get("JWT_TOKEN");

    return {
      keys: allKeys,
      accounts,
      currentAccount,
      hasToken: !!token,
    };
  } catch (error) {
    return null;
  }
}

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
