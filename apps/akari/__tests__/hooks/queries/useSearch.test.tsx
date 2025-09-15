import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useSearch } from '@/hooks/queries/useSearch';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

type SearchError = { type: string; message: string };

const mockSearchProfiles = jest.fn();
const mockSearchPosts = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    searchProfiles: mockSearchProfiles,
    searchPosts: mockSearchPosts,
  })),
}));

describe('useSearch', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 } },
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

  it('fetches profile results for users tab and paginates', async () => {
    mockSearchProfiles
      .mockResolvedValueOnce({ actors: [{ did: '1' }], cursor: 'c1' })
      .mockResolvedValueOnce({ actors: [{ did: '2' }], cursor: undefined });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('alice', 'users', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.pages[0].results).toEqual([
        { type: 'profile', data: { did: '1' } },
      ]);
    });
    expect(mockSearchProfiles).toHaveBeenCalledWith('token', 'alice', 10, undefined);
    expect(mockSearchPosts).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data?.pages[1].results).toEqual([
        { type: 'profile', data: { did: '2' } },
      ]);
    });
    expect(mockSearchProfiles).toHaveBeenLastCalledWith('token', 'alice', 10, 'c1');
  });

  it('fetches post results for posts tab and paginates', async () => {
    mockSearchPosts
      .mockResolvedValueOnce({ posts: [{ uri: 'p1' }], cursor: 'c1' })
      .mockResolvedValueOnce({ posts: [{ uri: 'p2' }], cursor: undefined });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('hello', 'posts', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.pages[0].results).toEqual([
        { type: 'post', data: { uri: 'p1' } },
      ]);
    });
    expect(mockSearchPosts).toHaveBeenCalledWith('token', 'hello', 5, undefined);
    expect(mockSearchProfiles).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data?.pages[1].results).toEqual([
        { type: 'post', data: { uri: 'p2' } },
      ]);
    });
    expect(mockSearchPosts).toHaveBeenLastCalledWith('token', 'hello', 5, 'c1');
  });

  it('combines profile and post results for all tab', async () => {
    mockSearchProfiles.mockResolvedValueOnce({ actors: [{ did: '1' }], cursor: 'c1' });
    mockSearchPosts.mockResolvedValueOnce({ posts: [{ uri: 'p1' }], cursor: undefined });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('mix', 'all', 20), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.pages[0].results).toEqual([
        { type: 'profile', data: { did: '1' } },
        { type: 'post', data: { uri: 'p1' } },
      ]);
      expect(result.current.data?.pages[0].cursor).toBe('c1');
    });
    expect(mockSearchProfiles).toHaveBeenCalledWith('token', 'mix', 20, undefined);
    expect(mockSearchPosts).toHaveBeenCalledWith('token', 'mix', 20, undefined);
  });

  it('handles "from:handle" searches by only querying posts', async () => {
    mockSearchPosts.mockResolvedValueOnce({ posts: [{ uri: 'p1' }], cursor: 'c1' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('from:alice', 'all', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.pages[0].results).toEqual([
        { type: 'post', data: { uri: 'p1' } },
      ]);
    });
    expect(mockSearchPosts).toHaveBeenCalledWith('token', 'from:alice', 10, undefined);
    expect(mockSearchProfiles).not.toHaveBeenCalled();
  });

  it('returns empty results for invalid tab', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSearch('query', 'invalid' as unknown as 'all'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data?.pages[0].results).toEqual([]);
      expect(result.current.data?.pages[0].cursor).toBeUndefined();
    });
    expect(mockSearchProfiles).not.toHaveBeenCalled();
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });

  it('does not run query without token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('q'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockSearchProfiles).not.toHaveBeenCalled();
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });

  it('does not run query without search term', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch(undefined, 'users'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockSearchProfiles).not.toHaveBeenCalled();
    expect(mockSearchPosts).not.toHaveBeenCalled();
  });


  it('returns error when PDS URL is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('q', 'users'), { wrapper });

    await waitFor(() => {
      expect((result.current.error as SearchError).message).toBe(
        'No PDS URL available',
      );
    });
    expect(mockSearchProfiles).not.toHaveBeenCalled();
  });

  it.each([
    [{ response: { status: 401 } },
      { type: 'permission', message: 'Authentication failed. Please sign in again.' }],
    [{ response: { status: 403 } },
      { type: 'permission', message: 'Access to search is not allowed' }],
  ])('handles permission errors %p', async (apiError, expected) => {
    mockSearchProfiles.mockRejectedValue(apiError);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('q', 'users'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toEqual(expected);
    });
    expect(mockSearchProfiles).toHaveBeenCalledTimes(1);
  });

  it('retries network errors and reports network message', async () => {
    mockSearchProfiles.mockRejectedValue({ message: 'network fail' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('q', 'users'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toEqual({
        type: 'network',
        message: 'Network error. Please check your connection and try again',
      });
    });
    expect(mockSearchProfiles).toHaveBeenCalledTimes(4);
  });

  it('handles network error codes', async () => {
    mockSearchProfiles.mockRejectedValue({ code: 'NETWORK_ERROR' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('q', 'users'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toEqual({
        type: 'network',
        message: 'Network error. Please check your connection and try again',
      });
    });
  });

  it('handles server errors', async () => {
    mockSearchProfiles.mockRejectedValue({ response: { status: 500 } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('q', 'users'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toEqual({
        type: 'network',
        message: 'Server error. Please try again later',
      });
    });
  });

  it('handles unknown errors', async () => {
    mockSearchProfiles.mockRejectedValue({ message: 'oops' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSearch('q', 'users'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toEqual({
        type: 'unknown',
        message: 'Failed to search',
      });
    });
  });
});

