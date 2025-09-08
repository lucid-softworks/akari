import { Account } from '@/types/account';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// Create an encrypted MMKV instance for sensitive data like JWT tokens
const secureStorage = new MMKV({
  id: 'secure-storage',
  // IMPORTANT: Replace this with a secure key in production!
  // This is a development-only key. For production, use a cryptographically secure random key
  // that is stored securely (e.g., in environment variables or secure key management)
  encryptionKey: Platform.OS === 'web' ? undefined : 'dev-key-akari-v2-2024-secure-storage-encryption',
});

type Data = {
  accounts: Account[];
  currentAccount: Account;
  jwtToken: string;
  refreshToken: string;
  selectedFeed: string;
};

export const storage = {
  getItem: <K extends keyof Data>(key: K): Data[K] | null => {
    const value = secureStorage.getString(key);
    return value !== undefined && value !== null ? (JSON.parse(value) as Data[K]) : null;
  },
  setItem: <T>(key: keyof Data, value: T) => {
    secureStorage.set(key, JSON.stringify(value));
  },
  removeItem: (key: keyof Data) => secureStorage.delete(key),
};
