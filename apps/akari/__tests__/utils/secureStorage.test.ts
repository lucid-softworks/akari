const store: Record<string, string> = {};

const mockGetString = jest.fn((key: string) => store[key]);
const mockSet = jest.fn((key: string, value: string) => {
  store[key] = value;
});
const mockDelete = jest.fn((key: string) => {
  delete store[key];
});

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    getString: mockGetString,
    set: mockSet,
    delete: mockDelete,
  })),
}));

describe('secureStorage', () => {
  beforeEach(() => {
    jest.resetModules();
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    mockGetString.mockClear();
    mockSet.mockClear();
    mockDelete.mockClear();
  });

  const loadInitialised = () => {
    const mod = require('@/utils/secureStorage');
    mod.initialiseSecureStorage('test-key');
    return mod;
  };

  it('sets and retrieves items as JSON', () => {
    const { storage } = loadInitialised();
    storage.setItem('jwtToken', 'token');
    expect(mockSet).toHaveBeenCalledWith('jwtToken', JSON.stringify('token'));
    expect(storage.getItem('jwtToken')).toBe('token');
  });

  it('removes items from storage', () => {
    const { storage } = loadInitialised();
    storage.setItem('jwtToken', 'token');
    storage.removeItem('jwtToken');
    expect(mockDelete).toHaveBeenCalledWith('jwtToken');
    expect(storage.getItem('jwtToken')).toBeNull();
  });

  it('throws when accessed before initialisation', () => {
    const { storage } = require('@/utils/secureStorage');
    expect(() => storage.getItem('jwtToken')).toThrow(/before initialisation/);
  });
});
