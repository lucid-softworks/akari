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
    expect(mockGetAuthorFeed).toHaveBeenCalledWith('token', 'alice', 5, undefined, undefined, []);
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

    expect(mockGetAuthorFeed).toHaveBeenNthCalledWith(
      1,
      'token',
      'alice',
      50,
      undefined,
      undefined,
      [],
    );
    expect(mockGetAuthorFeed).toHaveBeenNthCalledWith(
      2,
      'token',
      'alice',
      50,
      'cursor1',
      undefined,
      [],
    );
  });

  it('falls back to the public AppView guest path when PDS URL is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    mockGetAuthorFeed.mockResolvedValueOnce({
      feed: [{ post: { uri: 'at://1' } }],
      cursor: undefined,
    });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuthorPosts('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'at://1' }]);
    });
    // Guest path: empty token, no PDS proxy.
    expect(mockGetAuthorFeed).toHaveBeenCalledWith('', 'alice', 50, undefined, undefined, []);
  });

  it('does not run query without identifier', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuthorPosts(undefined), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetAuthorFeed).not.toHaveBeenCalled();
  });

  it('uses the guest path when no token is available', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    mockGetAuthorFeed.mockResolvedValueOnce({
      feed: [{ post: { uri: 'at://1' } }],
      cursor: undefined,
    });
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAuthorPosts('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'at://1' }]);
    });
    // Guest path: empty token passed through to the public AppView.
    expect(mockGetAuthorFeed).toHaveBeenCalledWith('', 'alice', 50, undefined, undefined, []);
  });
});

