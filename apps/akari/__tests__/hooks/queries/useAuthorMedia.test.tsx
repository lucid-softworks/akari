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

    expect(mockGetAuthorFeed).toHaveBeenCalledWith('token', 'alice', 10, undefined, 'posts_with_media', []);
    expect(result.current.data).toEqual([{ uri: '1' }, { uri: '2' }]);
  });

  it('uses the guest path when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    mockGetAuthorFeed.mockResolvedValue({ feed: [{ post: { uri: '1' } }], cursor: undefined });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorMedia('alice', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Guest path: empty token passed through to the public AppView.
    expect(mockGetAuthorFeed).toHaveBeenCalledWith('', 'alice', 10, undefined, 'posts_with_media', []);
  });

  it('falls back to the guest path when PDS URL is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    mockGetAuthorFeed.mockResolvedValue({ feed: [{ post: { uri: '1' } }], cursor: undefined });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthorMedia('alice', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ uri: '1' }]);
    expect(mockGetAuthorFeed).toHaveBeenCalledWith('', 'alice', 10, undefined, 'posts_with_media', []);
  });
});
