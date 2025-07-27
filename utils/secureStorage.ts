import { MMKV } from "react-native-mmkv";

// Create an encrypted MMKV instance for sensitive data like JWT tokens
export const secureStorage = new MMKV({
  id: "secure-storage",
  // IMPORTANT: Replace this with a secure key in production!
  // This is a development-only key. For production, use a cryptographically secure random key
  // that is stored securely (e.g., in environment variables or secure key management)
  encryptionKey: "dev-key-akari-v2-2024-secure-storage-encryption",
});

// Storage keys
export const STORAGE_KEYS = {
  JWT_TOKEN: "jwt_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DID: "user_did",
  USER_HANDLE: "user_handle",
  CURRENT_ACCOUNT_ID: "current_account_id",
  ACCOUNTS: "accounts",
  SELECTED_FEED: "selected_feed",
} as const;

// Type for storage keys
export type StorageKey = keyof typeof STORAGE_KEYS;

// Account type
export type Account = {
  id: string;
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  jwtToken: string;
  refreshToken: string;
  createdAt: number;
};

// Secure storage functions
export const secureStorageUtils = {
  // Set a value in secure storage
  set: (key: StorageKey, value: string): void => {
    try {
      secureStorage.set(key, value);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
    }
  },

  // Get a value from secure storage
  get: (key: StorageKey): string | null => {
    try {
      return secureStorage.getString(key) || null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  // Check if a key exists
  has: (key: StorageKey): boolean => {
    try {
      return secureStorage.contains(key);
    } catch (error) {
      console.error(`Error checking ${key}:`, error);
      return false;
    }
  },

  // Delete a key
  delete: (key: StorageKey): void => {
    try {
      secureStorage.delete(key);
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
    }
  },

  // Clear all secure storage
  clear: (): void => {
    try {
      secureStorage.clearAll();
    } catch (error) {
      console.error("Error clearing secure storage:", error);
    }
  },

  // Get all keys
  getAllKeys: (): string[] => {
    try {
      return secureStorage.getAllKeys();
    } catch (error) {
      console.error("Error getting all keys:", error);
      return [];
    }
  },

  // Set JSON value
  setJSON: (key: StorageKey, value: any): void => {
    try {
      secureStorage.set(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting JSON ${key}:`, error);
    }
  },

  // Get JSON value
  getJSON: (key: StorageKey): any => {
    try {
      const value = secureStorage.getString(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting JSON ${key}:`, error);
      return null;
    }
  },
};

// JWT-specific functions
export const jwtStorage = {
  // Save JWT token
  setToken: (token: string): void => {
    secureStorageUtils.set("JWT_TOKEN", token);
  },

  // Get JWT token
  getToken: (): string | null => {
    return secureStorageUtils.get("JWT_TOKEN");
  },

  // Save refresh token
  setRefreshToken: (token: string): void => {
    secureStorageUtils.set("REFRESH_TOKEN", token);
  },

  // Get refresh token
  getRefreshToken: (): string | null => {
    return secureStorageUtils.get("REFRESH_TOKEN");
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return secureStorageUtils.has("JWT_TOKEN");
  },

  // Clear all authentication data
  clearAuth: (): void => {
    secureStorageUtils.delete("JWT_TOKEN");
    secureStorageUtils.delete("REFRESH_TOKEN");
    secureStorageUtils.delete("USER_DID");
    secureStorageUtils.delete("USER_HANDLE");
    secureStorageUtils.delete("CURRENT_ACCOUNT_ID");
  },

  // Save user data
  setUserData: (did: string, handle: string): void => {
    secureStorageUtils.set("USER_DID", did);
    secureStorageUtils.set("USER_HANDLE", handle);
  },

  // Get user data
  getUserData: (): { did: string | null; handle: string | null } => {
    return {
      did: secureStorageUtils.get("USER_DID"),
      handle: secureStorageUtils.get("USER_HANDLE"),
    };
  },

  // Multi-account functions
  getAllAccounts: (): Account[] => {
    const accounts = secureStorageUtils.getJSON("ACCOUNTS") || [];
    console.log("getAllAccounts: Found", accounts.length, "accounts");
    console.log("getAllAccounts: Accounts:", accounts);
    return accounts;
  },

  getCurrentAccountId: (): string | null => {
    return secureStorageUtils.get("CURRENT_ACCOUNT_ID");
  },

  getCurrentAccount: (): Account | null => {
    const currentId = secureStorageUtils.get("CURRENT_ACCOUNT_ID");
    if (!currentId) return null;

    const accounts = secureStorageUtils.getJSON("ACCOUNTS") || [];
    return (
      accounts.find((account: Account) => account.id === currentId) || null
    );
  },

  addAccount: (account: Omit<Account, "id" | "createdAt">): string => {
    const accounts = secureStorageUtils.getJSON("ACCOUNTS") || [];
    const newAccount: Account = {
      ...account,
      id: `${account.handle}-${Date.now()}`,
      createdAt: Date.now(),
    };

    accounts.push(newAccount);
    secureStorageUtils.setJSON("ACCOUNTS", accounts);

    return newAccount.id;
  },

  switchAccount: (accountId: string): boolean => {
    const accounts = secureStorageUtils.getJSON("ACCOUNTS") || [];
    const account = accounts.find((acc: Account) => acc.id === accountId);

    if (!account) return false;

    secureStorageUtils.set("CURRENT_ACCOUNT_ID", accountId);
    secureStorageUtils.set("JWT_TOKEN", account.jwtToken);
    secureStorageUtils.set("REFRESH_TOKEN", account.refreshToken);
    secureStorageUtils.set("USER_DID", account.did);
    secureStorageUtils.set("USER_HANDLE", account.handle);

    return true;
  },

  removeAccount: (accountId: string): boolean => {
    const accounts = secureStorageUtils.getJSON("ACCOUNTS") || [];
    const filteredAccounts = accounts.filter(
      (acc: Account) => acc.id !== accountId
    );

    if (filteredAccounts.length === accounts.length) return false;

    secureStorageUtils.setJSON("ACCOUNTS", filteredAccounts);

    // If we removed the current account, switch to the first available one
    const currentId = secureStorageUtils.get("CURRENT_ACCOUNT_ID");
    if (currentId === accountId) {
      if (filteredAccounts.length > 0) {
        jwtStorage.switchAccount(filteredAccounts[0].id);
      } else {
        jwtStorage.clearAuth();
      }
    }

    return true;
  },

  updateAccount: (accountId: string, updates: Partial<Account>): boolean => {
    const accounts = secureStorageUtils.getJSON("ACCOUNTS") || [];
    const accountIndex = accounts.findIndex(
      (acc: Account) => acc.id === accountId
    );

    if (accountIndex === -1) return false;

    accounts[accountIndex] = { ...accounts[accountIndex], ...updates };
    secureStorageUtils.setJSON("ACCOUNTS", accounts);

    // Update current account data if this is the current account
    const currentId = secureStorageUtils.get("CURRENT_ACCOUNT_ID");
    if (currentId === accountId) {
      secureStorageUtils.set("JWT_TOKEN", accounts[accountIndex].jwtToken);
      secureStorageUtils.set(
        "REFRESH_TOKEN",
        accounts[accountIndex].refreshToken
      );
      secureStorageUtils.set("USER_DID", accounts[accountIndex].did);
      secureStorageUtils.set("USER_HANDLE", accounts[accountIndex].handle);
    }

    return true;
  },
};
