import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useAuthorReplies } from '@/hooks/queries/useAuthorReplies';
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

describe('useAuthorReplies', () => {
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
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
  });

  it('fetches author replies and deduplicates posts', async () => {
    const { wrapper } = createWrapper();

    const firstPage = {
      feed: [
        { post: { uri: 'uri1' } },
        { post: { uri: 'uri1' } },
        { post: { uri: 'uri2' } },
      ],
      cursor: 'cursor1',
    };
    const secondPage = {
      feed: [{ post: { uri: 'uri3' } }],
      cursor: undefined,
    };

    mockGetAuthorFeed.mockResolvedValueOnce(firstPage);
    mockGetAuthorFeed.mockResolvedValueOnce(secondPage);

    const { result } = renderHook(() => useAuthorReplies('alice', 20), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(mockGetAuthorFeed).toHaveBeenCalledWith(
      'token',
      'alice',
      20,
      undefined,
      'posts_with_replies',
    );

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(mockGetAuthorFeed).toHaveBeenLastCalledWith(
      'token',
      'alice',
      20,
      'cursor1',
      'posts_with_replies',
    );
  });

  it('does not fetch when identifier is undefined', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useAuthorReplies(undefined), { wrapper });

    await waitFor(() => {
      expect(mockGetAuthorFeed).not.toHaveBeenCalled();
    });
  });

  it('returns error when no PDS URL is available', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorReplies('alice'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('No PDS URL available');
    expect(mockGetAuthorFeed).not.toHaveBeenCalled();
  });
});

