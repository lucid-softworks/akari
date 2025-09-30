import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useAuthorFeeds } from '@/hooks/queries/useAuthorFeeds';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetAuthorFeeds = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getAuthorFeeds: mockGetAuthorFeeds,
  })),
}));

describe('useAuthorFeeds query hook', () => {
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
      data: { pdsUrl: 'https://pds' },
    });
  });

  it('fetches author feeds and flattens pages', async () => {
    mockGetAuthorFeeds
      .mockResolvedValueOnce({ feeds: [{ uri: 'a' }], cursor: 'next' })
      .mockResolvedValueOnce({ feeds: [{ uri: 'b' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorFeeds('alice', 5), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetAuthorFeeds).toHaveBeenCalledWith('alice', 5, undefined);
    expect(result.current.data).toEqual([{ uri: 'a' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'a' }, { uri: 'b' }]);
    });
  });

  it('throws error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorFeeds('alice', 5), {
      wrapper,
    });

    const fetchResult = await result.current.fetchNextPage();
    expect((fetchResult.error as Error).message).toBe('No access token');
  });

  it('throws error when identifier is missing', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorFeeds(undefined, 5), {
      wrapper,
    });

    const fetchResult = await result.current.fetchNextPage();
    expect((fetchResult.error as Error).message).toBe(
      'No identifier provided',
    );
  });

  it('throws error when pdsUrl is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorFeeds('alice', 5), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect((result.current.error as Error).message).toBe('No PDS URL available');
    });
  });
});

