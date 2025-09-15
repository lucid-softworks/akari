import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useFeeds } from '@/hooks/queries/useFeeds';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetFeeds = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getFeeds: mockGetFeeds,
  })),
}));

describe('useFeeds query hook', () => {
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
      data: { pdsUrl: 'https://pds' },
    });
  });

  it('fetches feeds for an actor', async () => {
    const feedsResponse = { feeds: [{ uri: 'a' }], cursor: 'next' };
    mockGetFeeds.mockResolvedValueOnce(feedsResponse);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeeds('alice', 10, 'cursor'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetFeeds).toHaveBeenCalledWith('token', 'alice', 10, 'cursor');
    expect(result.current.data).toEqual(feedsResponse);
  });

  it('throws error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeeds('alice'), { wrapper });

    const { error } = await result.current.refetch();
    expect((error as Error).message).toBe('No access token');
  });

  it('throws error when actor is missing', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeeds(undefined), { wrapper });

    const { error } = await result.current.refetch();
    expect((error as Error).message).toBe('No actor provided');
  });

  it('throws error when pdsUrl is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeeds('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toBe('No PDS URL available');
  });
});

