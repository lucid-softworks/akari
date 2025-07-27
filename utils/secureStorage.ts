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
  USER_ID: "user_id",
  USER_EMAIL: "user_email",
} as const;

// Type for storage keys
export type StorageKey = keyof typeof STORAGE_KEYS;

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
    secureStorageUtils.delete("USER_ID");
    secureStorageUtils.delete("USER_EMAIL");
  },

  // Save user data
  setUserData: (userId: string, email: string): void => {
    secureStorageUtils.set("USER_ID", userId);
    secureStorageUtils.set("USER_EMAIL", email);
  },

  // Get user data
  getUserData: (): { userId: string | null; email: string | null } => {
    return {
      userId: secureStorageUtils.get("USER_ID"),
      email: secureStorageUtils.get("USER_EMAIL"),
    };
  },
};
