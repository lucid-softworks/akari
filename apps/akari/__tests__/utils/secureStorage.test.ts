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
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    mockGetString.mockClear();
    mockSet.mockClear();
    mockDelete.mockClear();
  });

  it('sets and retrieves items as JSON', () => {
    const { storage } = require('@/utils/secureStorage');
    storage.setItem('jwtToken', 'token');
    expect(mockSet).toHaveBeenCalledWith('jwtToken', JSON.stringify('token'));
    expect(storage.getItem('jwtToken')).toBe('token');
  });

  it('removes items from storage', () => {
    const { storage } = require('@/utils/secureStorage');
    storage.setItem('jwtToken', 'token');
    storage.removeItem('jwtToken');
    expect(mockDelete).toHaveBeenCalledWith('jwtToken');
    expect(storage.getItem('jwtToken')).toBeNull();
  });
});
