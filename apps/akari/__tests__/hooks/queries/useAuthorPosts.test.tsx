import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuthorPosts } from '@/hooks/queries/useAuthorPosts';
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
  BlueskyApi: jest.fn(() => ({ getAuthorFeed: mockGetAuthorFeed })),
}));

describe('useAuthorPosts', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds' },
    });
  });

  it('returns only unique original posts', async () => {
    mockGetAuthorFeed.mockResolvedValueOnce({
      feed: [
        { post: { uri: 'at://1' } },
        { post: { uri: 'at://2' }, reason: {} },
        { post: { uri: 'at://3' }, reply: {} },
        { post: { uri: 'at://1' } },
        { post: { uri: 'at://4' } },
      ],
      cursor: undefined,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuthorPosts('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'at://1' }, { uri: 'at://4' }]);
    });
    expect(mockGetAuthorFeed).toHaveBeenCalledWith('alice', 5, undefined);
  });

  it('fetches next page using cursor', async () => {
    mockGetAuthorFeed
      .mockResolvedValueOnce({
        feed: [{ post: { uri: 'at://1' } }],
        cursor: 'cursor1',
      })
      .mockResolvedValueOnce({
        feed: [{ post: { uri: 'at://2' } }],
        cursor: undefined,
      });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuthorPosts('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'at://1' }]);
    });

    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'at://1' }, { uri: 'at://2' }]);
    });

    expect(mockGetAuthorFeed).toHaveBeenNthCalledWith(1, 'alice', 20, undefined);
    expect(mockGetAuthorFeed).toHaveBeenNthCalledWith(
      2,
      'alice',
      20,
      'cursor1',
    );
  });

  it('returns error when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuthorPosts('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('No PDS URL available');
    });
  });

  it('does not run query without identifier', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuthorPosts(undefined), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetAuthorFeed).not.toHaveBeenCalled();
  });

  it('does not run query without token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuthorPosts('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetAuthorFeed).not.toHaveBeenCalled();
  });
});

