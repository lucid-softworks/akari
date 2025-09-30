import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuthorMedia } from '@/hooks/queries/useAuthorMedia';
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

describe('useAuthorMedia', () => {
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

  it('fetches author media and deduplicates posts', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    mockGetAuthorFeed.mockResolvedValue({
      feed: [{ post: { uri: '1' } }, { post: { uri: '1' } }, { post: { uri: '2' } }],
      cursor: 'cursor',
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorMedia('alice', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetAuthorFeed).toHaveBeenCalledWith('alice', 10, undefined, 'posts_with_media');
    expect(result.current.data).toEqual([{ uri: '1' }, { uri: '2' }]);
  });

  it('does not run query when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });

    const { wrapper } = createWrapper();
    renderHook(() => useAuthorMedia('alice', 10), { wrapper });

    expect(mockGetAuthorFeed).not.toHaveBeenCalled();
  });

  it('returns error when PDS URL is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorMedia('alice', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetAuthorFeed).not.toHaveBeenCalled();
    expect((result.current.error as Error).message).toBe('No PDS URL available');
  });
});
