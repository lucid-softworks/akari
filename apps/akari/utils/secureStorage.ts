import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { Account } from '@/types/account';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

// Stashed on `globalThis` so Fast Refresh re-evaluating this module reuses the
// live MMKV handle instead of dropping it and forcing every storage consumer
// to re-bootstrap (which would log the user out mid-edit).
const SECURE_STORAGE_GLOBAL_KEY = '__akari_secureStorage_v1' as const;
type SecureStorageGlobals = { [SECURE_STORAGE_GLOBAL_KEY]?: MMKV };
const globalsRef = globalThis as unknown as SecureStorageGlobals;

/**
 * Initialise the MMKV-backed secure store with a per-install encryption key.
 *
 * Must be called once at app boot, before any `storage` access. On web pass
 * `undefined` — the browser has no keychain to anchor a per-install key to,
 * so we leave the store unencrypted (the bundle would expose any baked-in key
 * anyway). Calling this more than once is a no-op so HMR doesn't tear down
 * the live MMKV file handle.
 */
export function initialiseSecureStorage(encryptionKey: string | undefined): MMKV {
  if (!globalsRef[SECURE_STORAGE_GLOBAL_KEY]) {
    globalsRef[SECURE_STORAGE_GLOBAL_KEY] = new MMKV({
      id: 'secure-storage',
      encryptionKey: Platform.OS === 'web' ? undefined : encryptionKey,
    });
  }
  return globalsRef[SECURE_STORAGE_GLOBAL_KEY]!;
}

function getSecureStorage(): MMKV {
  const instance = globalsRef[SECURE_STORAGE_GLOBAL_KEY];
  if (!instance) {
    throw new Error(
      'secureStorage accessed before initialisation. Call bootstrapSecureStorage() before rendering.',
    );
  }
  return instance;
}

type Data = {
  accounts: Account[];
  currentAccount: Account;
  jwtToken: string;
  refreshToken: string;
  selectedFeed: string;
  reactQueryCache: PersistedClient;
};

export const REACT_QUERY_CACHE_STORAGE_KEY = 'reactQueryCache' as const;

export const storage = {
  getItem: <K extends keyof Data>(key: K): Data[K] | null => {
    const value = getSecureStorage().getString(key);
    return value !== undefined && value !== null ? (JSON.parse(value) as Data[K]) : null;
  },
  setItem: <T>(key: keyof Data, value: T) => {
    getSecureStorage().set(key, JSON.stringify(value));
  },
  removeItem: (key: keyof Data) => getSecureStorage().delete(key),
};
