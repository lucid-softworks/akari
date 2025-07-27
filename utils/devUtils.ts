import { secureStorageUtils } from "./secureStorage";

/**
 * Development utility to clear all MMKV storage data
 * This is useful for testing and debugging
 */
export const clearAllStorage = () => {
  try {
    // Clear all secure storage
    secureStorageUtils.clear();

    console.log("✅ All MMKV storage data cleared successfully");

    return true;
  } catch (error) {
    console.error("❌ Failed to clear storage:", error);
    return false;
  }
};

/**
 * Development utility to log current storage state
 */
export const logStorageState = () => {
  try {
    const allKeys = secureStorageUtils.getAllKeys();
    console.log("📦 Current storage keys:", allKeys);

    // Log some specific values for debugging
    const accounts = secureStorageUtils.getJSON("ACCOUNTS");
    const currentAccount = secureStorageUtils.get("CURRENT_ACCOUNT_ID");
    const token = secureStorageUtils.get("JWT_TOKEN");

    console.log("👥 Accounts:", accounts);
    console.log("🔄 Current account ID:", currentAccount);
    console.log("🔑 Has token:", !!token);
  } catch (error) {
    console.error("❌ Failed to log storage state:", error);
  }
};
