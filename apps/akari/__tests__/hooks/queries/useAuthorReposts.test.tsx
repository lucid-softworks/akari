import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useAuthorReposts } from '@/hooks/queries/useAuthorReposts';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';

const mockGetAuthorFeed = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/useAppViewEnabled', () => ({
  useAppViewEnabled: jest.fn(),
}));

jest.mock('@/hooks/queries/useAcceptLabelerDids', () => ({
  useAcceptLabelerDids: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getAuthorFeed: mockGetAuthorFeed,
  })),
}));

const repostReason = { $type: 'app.bsky.feed.defs#reasonRepost' };

describe('useAuthorReposts query hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    (useAppViewEnabled as jest.Mock).mockReturnValue(true);
    (useAcceptLabelerDids as jest.Mock).mockReturnValue(['did:labeler']);
  });

  it('keeps only reposts, dedupes by uri, and flattens pages', async () => {
    mockGetAuthorFeed
      .mockResolvedValueOnce({
        feed: [
          { post: { uri: 'a' }, reason: repostReason },
          { post: { uri: 'b' } }, // not a repost, dropped
          { post: { uri: 'a' }, reason: repostReason }, // duplicate, deduped
        ],
        cursor: 'next',
      })
      .mockResolvedValueOnce({
        feed: [{ post: { uri: 'c' }, reason: repostReason }],
        cursor: undefined,
      });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorReposts('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetAuthorFeed).toHaveBeenCalledWith(
      'token',
      'alice',
      5,
      undefined,
      undefined,
      ['did:labeler'],
    );
    expect(result.current.data).toEqual([{ uri: 'a' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'a' }, { uri: 'c' }]);
    });
    expect(mockGetAuthorFeed).toHaveBeenLastCalledWith(
      'token',
      'alice',
      5,
      'next',
      undefined,
      ['did:labeler'],
    );
  });

  it('uses the guest path with an empty token when no token is present', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    mockGetAuthorFeed.mockResolvedValueOnce({
      feed: [{ post: { uri: 'a' }, reason: repostReason }],
      cursor: undefined,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorReposts('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetAuthorFeed).toHaveBeenCalledWith(
      '',
      'alice',
      5,
      undefined,
      undefined,
      ['did:labeler'],
    );
    expect(result.current.data).toEqual([{ uri: 'a' }]);
  });

  it('uses the guest path when the account has no PDS URL', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    mockGetAuthorFeed.mockResolvedValueOnce({
      feed: [{ post: { uri: 'a' }, reason: repostReason }],
      cursor: undefined,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorReposts('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetAuthorFeed).toHaveBeenCalledWith(
      '',
      'alice',
      5,
      undefined,
      undefined,
      ['did:labeler'],
    );
  });

  it('throws when no identifier is provided', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorReposts(undefined, 5), { wrapper });

    const fetchResult = await result.current.fetchNextPage();
    expect((fetchResult.error as Error).message).toBe('No identifier provided');
    expect(mockGetAuthorFeed).not.toHaveBeenCalled();
  });
});
