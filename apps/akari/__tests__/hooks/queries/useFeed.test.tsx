import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useFeed } from '@/hooks/queries/useFeed';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetFeed = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getFeed: mockGetFeed,
  })),
}));

describe('useFeed query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds' },
    });
  });

  it('fetches feed posts and handles pagination', async () => {
    mockGetFeed
      .mockResolvedValueOnce({
        feed: [{ post: { uri: '1' } }],
        cursor: 'cursor1',
      })
      .mockResolvedValueOnce({
        feed: [{ post: { uri: '2' } }],
        cursor: undefined,
      });

    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeed('at://feed/1', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.pages[0].feed).toEqual([
        { post: { uri: '1' } },
      ]);
    });
    expect(mockGetFeed).toHaveBeenCalledWith('at://feed/1', 10, undefined);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data?.pages[1].feed).toEqual([
        { post: { uri: '2' } },
      ]);
    });
    expect(mockGetFeed).toHaveBeenLastCalledWith('at://feed/1', 10, 'cursor1');
  });

  it('returns error when pdsUrl is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeed('at://feed/1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect((result.current.error as Error).message).toBe('No PDS URL available');
    });
    expect(mockGetFeed).not.toHaveBeenCalled();
  });

  it('throws error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeed('at://feed/1'), { wrapper });

    const fetchResult = await result.current.fetchNextPage();
    expect((fetchResult.error as Error).message).toBe('No access token');
  });

  it('throws error when feed URI is missing', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeed(null), { wrapper });

    const fetchResult = await result.current.fetchNextPage();
    expect((fetchResult.error as Error).message).toBe('No feed URI provided');
  });
});

