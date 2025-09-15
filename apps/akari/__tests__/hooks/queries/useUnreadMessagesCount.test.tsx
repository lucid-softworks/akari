import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockListConversations = jest.fn();
const mockBlueskyApi = jest.fn(() => ({ listConversations: mockListConversations }));

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn((...args) => mockBlueskyApi(...args)),
}));

describe('useUnreadMessagesCount', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
  });

  it('returns total unread messages count', async () => {
    mockListConversations.mockResolvedValueOnce({
      convos: [
        { unreadCount: 2 },
        { unreadCount: 3 },
      ],
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUnreadMessagesCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBe(5);
    });

    expect(mockBlueskyApi).toHaveBeenCalledWith('https://pds');
    expect(mockListConversations).toHaveBeenCalledWith(
      'token',
      100,
      undefined,
      undefined,
      'accepted',
    );
  });

  it('returns 0 and logs warning on error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockListConversations.mockRejectedValueOnce(new Error('fail'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUnreadMessagesCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBe(0);
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to fetch unread messages count:',
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it('does not fetch when disabled', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUnreadMessagesCount(false), { wrapper });

    expect(result.current.data).toBeUndefined();
    await waitFor(() => {
      expect(mockListConversations).not.toHaveBeenCalled();
    });
  });
});

