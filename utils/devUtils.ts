import { secureStorageUtils } from "./secureStorage";

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
