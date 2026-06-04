const mockGetItemAsync = jest.fn<Promise<string | null>, [string]>();
const mockSetItemAsync = jest.fn<Promise<void>, [string, string, unknown?]>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: [string]) => mockGetItemAsync(...args),
  setItemAsync: (...args: [string, string, unknown?]) => mockSetItemAsync(...args),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));

const mockGetRandomBytes = jest.fn((size: number) => {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) bytes[i] = i % 256;
  return bytes;
});
jest.mock('expo-crypto', () => ({
  getRandomBytes: (size: number) => mockGetRandomBytes(size),
}));

const mockInitialiseSecureStorage = jest.fn();
jest.mock('@/utils/secureStorage', () => ({
  initialiseSecureStorage: (...args: unknown[]) => mockInitialiseSecureStorage(...args),
}));

const mockRecrypt = jest.fn();
const mockMMKV = jest.fn((_config: unknown) => ({ recrypt: mockRecrypt }));
jest.mock('react-native-mmkv', () => ({
  // Source uses `new MMKV(...)`; arrow functions can't be invoked with `new`,
  // so wrap the spy in a real function expression that forwards to it.
  MMKV: function MMKV(config: unknown) {
    return mockMMKV(config);
  },
}));

const KEYCHAIN_ENTRY = 'akari.secureStorage.encryptionKey.v1';
const GLOBAL_KEY = '__akari_secureStorageBootstrap_v1';

const setPlatform = (os: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Platform } = require('react-native');
  Platform.OS = os;
};

const loadModule = () => require('@/utils/secureStorageBootstrap');

describe('bootstrapSecureStorage', () => {
  beforeEach(() => {
    jest.resetModules();
    delete (globalThis as unknown as Record<string, unknown>)[GLOBAL_KEY];
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockSetItemAsync.mockResolvedValue(undefined);
    mockGetRandomBytes.mockClear();
    mockInitialiseSecureStorage.mockClear();
    mockRecrypt.mockReset();
    mockMMKV.mockClear();
    setPlatform('ios');
  });

  it('initialises with undefined on web without touching the keychain', async () => {
    setPlatform('web');
    const { bootstrapSecureStorage } = loadModule();
    await bootstrapSecureStorage();
    expect(mockInitialiseSecureStorage).toHaveBeenCalledWith(undefined);
    expect(mockGetItemAsync).not.toHaveBeenCalled();
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });

  it('reuses an existing keychain key on native', async () => {
    mockGetItemAsync.mockResolvedValue('existing-key');
    const { bootstrapSecureStorage } = loadModule();
    await bootstrapSecureStorage();
    expect(mockGetItemAsync).toHaveBeenCalledWith(KEYCHAIN_ENTRY);
    expect(mockInitialiseSecureStorage).toHaveBeenCalledWith('existing-key');
    // No key generation or persistence when one already exists.
    expect(mockGetRandomBytes).not.toHaveBeenCalled();
    expect(mockSetItemAsync).not.toHaveBeenCalled();
    expect(mockMMKV).not.toHaveBeenCalled();
  });

  it('generates, migrates, and persists a new key on first launch', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    const { bootstrapSecureStorage } = loadModule();
    await bootstrapSecureStorage();

    expect(mockGetRandomBytes).toHaveBeenCalledWith(32);

    // A base64 key is generated and threaded through every step consistently.
    const newKey = mockInitialiseSecureStorage.mock.calls[0][0] as string;
    expect(typeof newKey).toBe('string');
    expect(newKey.length).toBeGreaterThan(0);

    // Legacy MMKV store is opened with the old key and recrypted to the new one.
    expect(mockMMKV).toHaveBeenCalledWith({
      id: 'secure-storage',
      encryptionKey: 'dev-key-akari-v2-2024-secure-storage-encryption',
    });
    expect(mockRecrypt).toHaveBeenCalledWith(newKey);

    // The new key is persisted with the right keychain accessibility.
    expect(mockSetItemAsync).toHaveBeenCalledWith(KEYCHAIN_ENTRY, newKey, {
      keychainAccessible: 'AFTER_FIRST_UNLOCK',
    });

    // Persist happens before init.
    const setOrder = mockSetItemAsync.mock.invocationCallOrder[0];
    const initOrder = mockInitialiseSecureStorage.mock.invocationCallOrder[0];
    expect(setOrder).toBeLessThan(initOrder);
  });

  it('still completes when the legacy migration throws, warning in dev', async () => {
    const dev = (globalThis as unknown as { __DEV__?: boolean }).__DEV__;
    (globalThis as unknown as { __DEV__?: boolean }).__DEV__ = true;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockGetItemAsync.mockResolvedValue(null);
    mockMMKV.mockImplementation(() => {
      throw new Error('no legacy store');
    });
    const { bootstrapSecureStorage } = loadModule();
    await expect(bootstrapSecureStorage()).resolves.toBeUndefined();
    // Migration failure is swallowed; the new key is still persisted and used.
    expect(warnSpy).toHaveBeenCalledWith(
      'secureStorage legacy migration skipped:',
      expect.any(Error),
    );
    expect(mockSetItemAsync).toHaveBeenCalled();
    expect(mockInitialiseSecureStorage).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    (globalThis as unknown as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it('stays silent about a failed migration outside dev', async () => {
    const dev = (globalThis as unknown as { __DEV__?: boolean }).__DEV__;
    (globalThis as unknown as { __DEV__?: boolean }).__DEV__ = false;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockGetItemAsync.mockResolvedValue(null);
    mockMMKV.mockImplementation(() => {
      throw new Error('no legacy store');
    });
    const { bootstrapSecureStorage } = loadModule();
    await expect(bootstrapSecureStorage()).resolves.toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(mockInitialiseSecureStorage).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    (globalThis as unknown as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it('shares one in-flight promise across re-entrant calls', async () => {
    mockGetItemAsync.mockResolvedValue('existing-key');
    const { bootstrapSecureStorage } = loadModule();
    const first = bootstrapSecureStorage();
    const second = bootstrapSecureStorage();
    expect(first).toBe(second);
    await first;
    // Only one bootstrap actually ran despite two calls.
    expect(mockGetItemAsync).toHaveBeenCalledTimes(1);
    expect(mockInitialiseSecureStorage).toHaveBeenCalledTimes(1);
  });

  it('clears the cached promise on failure so a retry can succeed', async () => {
    mockGetItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    const { bootstrapSecureStorage } = loadModule();
    await expect(bootstrapSecureStorage()).rejects.toThrow('keychain locked');

    // The failed promise must not be cached; a retry runs fresh and succeeds.
    mockGetItemAsync.mockResolvedValue('existing-key');
    await expect(bootstrapSecureStorage()).resolves.toBeUndefined();
    expect(mockInitialiseSecureStorage).toHaveBeenCalledWith('existing-key');
  });
});
