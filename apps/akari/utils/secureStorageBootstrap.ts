import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

import { initialiseSecureStorage } from './secureStorage';

const ENCRYPTION_KEY_KEYCHAIN_ENTRY = 'akari.secureStorage.encryptionKey.v1';

/**
 * Pre-1.9 builds shipped with this static encryption key compiled into the
 * bundle. Existing installs need their MMKV file recrypted with the new
 * per-install key so users don't get logged out on upgrade.
 *
 * Once we're confident no installs in the wild are still on the legacy key
 * (a few releases out), this constant and the migration block in
 * `bootstrapSecureStorage` can be deleted.
 */
const LEGACY_ENCRYPTION_KEY = 'dev-key-akari-v2-2024-secure-storage-encryption';

const KEY_BYTES = 32;

let bootstrapPromise: Promise<void> | null = null;

/**
 * Resolve the per-install MMKV encryption key from the OS keychain (creating
 * it on first launch) and initialise the secure storage singleton. Idempotent
 * across re-entrant calls — the second caller awaits the first.
 */
export function bootstrapSecureStorage(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = doBootstrap().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

async function doBootstrap(): Promise<void> {
  if (Platform.OS === 'web') {
    initialiseSecureStorage(undefined);
    return;
  }

  const existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_KEYCHAIN_ENTRY);

  if (existingKey) {
    initialiseSecureStorage(existingKey);
    return;
  }

  const newKey = generateEncryptionKey();

  await migrateLegacyStore(newKey);

  await SecureStore.setItemAsync(ENCRYPTION_KEY_KEYCHAIN_ENTRY, newKey, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });

  initialiseSecureStorage(newKey);
}

function generateEncryptionKey(): string {
  const bytes = Crypto.getRandomBytes(KEY_BYTES);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

async function migrateLegacyStore(newKey: string): Promise<void> {
  let legacy: MMKV | null = null;
  try {
    legacy = new MMKV({ id: 'secure-storage', encryptionKey: LEGACY_ENCRYPTION_KEY });
    legacy.recrypt(newKey);
  } catch (error) {
    if (__DEV__) {
      console.warn('secureStorage legacy migration skipped:', error);
    }
  }
}
