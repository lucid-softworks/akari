import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useAuthorLikes } from '@/hooks/queries/useAuthorLikes';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetAuthorFeed = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getAuthorFeed: mockGetAuthorFeed,
  })),
}));

describe('useAuthorLikes query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
      data: { pdsUrl: 'https://pds' },
    });
    mockGetAuthorFeed
      .mockResolvedValueOnce({
        feed: [
          { post: { uri: 'p1', viewer: { like: 'l1' } } },
          { post: { uri: 'p2' } },
          { post: { uri: 'p1', viewer: { like: 'l1' } } },
        ],
        cursor: 'cursor1',
      })
      .mockResolvedValueOnce({
        feed: [],
        cursor: undefined,
      });
  });

  it('returns liked posts without duplicates', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorLikes('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([
        { uri: 'p1', viewer: { like: 'l1' } },
      ]);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockGetAuthorFeed).toHaveBeenCalledWith('alice', 20, undefined);
    expect(mockGetAuthorFeed).toHaveBeenCalledWith('alice', 20, 'cursor1');
  });

  it('errors when PDS url is missing', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorLikes('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

