const mockSetBadgeCountAsync = jest.fn();
const mockGetBadgeCountAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: mockSetBadgeCountAsync,
  getBadgeCountAsync: mockGetBadgeCountAsync,
  AndroidImportance: { DEFAULT: 'default', HIGH: 'high', LOW: 'low' },
}));

describe('notifications utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets badge count', async () => {
    const { setBadgeCount } = require('@/utils/notifications');
    await setBadgeCount(5);
    expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
  });

  it('gets badge count', async () => {
    mockGetBadgeCountAsync.mockResolvedValueOnce(7);
    const { getBadgeCount } = require('@/utils/notifications');
    const count = await getBadgeCount();
    expect(mockGetBadgeCountAsync).toHaveBeenCalled();
    expect(count).toBe(7);
  });
});
