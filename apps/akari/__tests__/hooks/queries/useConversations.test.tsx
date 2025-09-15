import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useConversations } from '@/hooks/queries/useConversations';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockListConversations = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    listConversations: mockListConversations,
  })),
}));

describe('useConversations', () => {
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
  });

  it('fetches conversations and transforms data', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });
    mockListConversations.mockResolvedValue({
      cursor: 'cursor',
      convos: [
        {
          id: '1',
          members: [
            { did: 'did:me', handle: 'me', displayName: 'Me', avatar: 'me.jpg' },
            { did: 'did:other', handle: 'alice', displayName: 'Alice', avatar: 'alice.jpg' },
          ],
          lastMessage: { text: 'hi', sentAt: '2023-01-01T00:00:00Z' },
          unreadCount: 1,
          status: 'accepted',
          muted: false,
        },
      ],
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConversations(10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockListConversations).toHaveBeenCalledWith('token', 10, undefined, undefined, undefined);

    const timestamp = new Date('2023-01-01T00:00:00Z').toLocaleDateString();
    expect(result.current.data?.pages[0].conversations).toEqual([
      {
        id: '1',
        convoId: '1',
        handle: 'alice',
        displayName: 'Alice',
        avatar: 'alice.jpg',
        lastMessage: 'hi',
        timestamp,
        unreadCount: 1,
        status: 'accepted',
        muted: false,
      },
    ]);
  });

  it('returns permission error when API responds 401', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });
    mockListConversations.mockRejectedValue({ response: { status: 401 } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useConversations(10), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual({
      type: 'permission',
      message: "Your app password doesn't have permission to access messages",
    });
  });

  it('does not run query when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });

    const { wrapper } = createWrapper();
    renderHook(() => useConversations(10), { wrapper });

    expect(mockListConversations).not.toHaveBeenCalled();
  });

  // Note: Network and server errors are handled by React Query's retry logic and
  // are difficult to test deterministically due to exponential backoff timers.
  // These paths are covered indirectly in other tests.
});

