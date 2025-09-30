import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuthorVideos } from '@/hooks/queries/useAuthorVideos';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetAuthorVideos = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getAuthorVideos: mockGetAuthorVideos,
  })),
}));

describe('useAuthorVideos', () => {
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
  });

  it('fetches author videos and deduplicates posts', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    mockGetAuthorVideos.mockResolvedValue({
      feed: [{ post: { uri: '1' } }, { post: { uri: '1' } }, { post: { uri: '2' } }],
      cursor: 'cursor',
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorVideos('alice', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetAuthorVideos).toHaveBeenCalledWith('alice', 10, undefined);
    expect(result.current.data).toEqual([{ uri: '1' }, { uri: '2' }]);
  });

  it('fetches next page using cursor', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    mockGetAuthorVideos
      .mockResolvedValueOnce({
        feed: [{ post: { uri: 'at://1' } }],
        cursor: 'cursor1',
      })
      .mockResolvedValueOnce({
        feed: [{ post: { uri: 'at://2' } }],
        cursor: undefined,
      });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorVideos('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'at://1' }]);
    });

    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'at://1' }, { uri: 'at://2' }]);
    });

    expect(mockGetAuthorVideos).toHaveBeenNthCalledWith(1, 'alice', 20, undefined);
    expect(mockGetAuthorVideos).toHaveBeenNthCalledWith(2, 'alice', 20, 'cursor1');
  });

  it('returns error when PDS URL missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorVideos('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('No PDS URL available');
    });
  });

  it('does not run query without identifier', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorVideos(undefined), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetAuthorVideos).not.toHaveBeenCalled();
  });

  it('does not run query without token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorVideos('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetAuthorVideos).not.toHaveBeenCalled();
  });
});

