import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useAuthorWhtwndPosts } from '@/hooks/queries/useAuthorWhtwndPosts';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetAuthorWhtwndPosts = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getAuthorWhtwndPosts: mockGetAuthorWhtwndPosts,
  })),
}));

describe('useAuthorWhtwndPosts query hook', () => {
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
  });

  it('fetches and paginates Whtwnd posts', async () => {
    mockGetAuthorWhtwndPosts
      .mockResolvedValueOnce({ records: [{ uri: 'at://post/1' }], cursor: 'cursor1' })
      .mockResolvedValueOnce({ records: [{ uri: 'at://post/2' }], cursor: undefined });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorWhtwndPosts('did', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([{ uri: 'at://post/1' }]);
    expect(mockGetAuthorWhtwndPosts).toHaveBeenCalledWith('token', 'did', 5, undefined);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'at://post/1' }, { uri: 'at://post/2' }]);
    });
    expect(mockGetAuthorWhtwndPosts).toHaveBeenCalledWith('token', 'did', 5, 'cursor1');
  });

  it('errors when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorWhtwndPosts('did'), { wrapper });

    await expect(result.current.refetch({ throwOnError: true })).rejects.toThrow('No access token');
  });

  it('errors when identifier is missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorWhtwndPosts(undefined), { wrapper });

    await expect(result.current.refetch({ throwOnError: true })).rejects.toThrow('No identifier provided');
  });

  it('errors when PDS URL is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorWhtwndPosts('did'), { wrapper });

    await expect(result.current.refetch({ throwOnError: true })).rejects.toThrow('No PDS URL available');
  });
});
