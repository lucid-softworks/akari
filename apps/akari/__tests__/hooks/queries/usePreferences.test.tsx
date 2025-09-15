import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePreferences, useSavedFeeds } from '@/hooks/queries/usePreferences';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';
import type { BlueskyFeed } from '@/bluesky-api';

const mockGetPreferences = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getPreferences: mockGetPreferences,
  })),
}));

jest.mock('@/hooks/queries/useFeedGenerators', () => ({
  useFeedGenerators: jest.fn(),
}));

describe('usePreferences', () => {
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

  it('fetches user preferences', async () => {
    const preferences = { preferences: [] };
    mockGetPreferences.mockResolvedValue(preferences);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(preferences);
    });
    expect(mockGetPreferences).toHaveBeenCalledWith('token');
  });

  it('throws error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePreferences(), { wrapper });

    const fetchResult = await result.current.refetch();
    expect((fetchResult.error as Error).message).toBe('No access token');
  });

  it('throws error when PDS URL is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePreferences(), { wrapper });

    const fetchResult = await result.current.refetch();
    expect((fetchResult.error as Error).message).toBe('No PDS URL available');
  });
});

describe('useSavedFeeds', () => {
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

  it('returns saved feeds with metadata', async () => {
    const preferences = {
      preferences: [
        {
          $type: 'app.bsky.actor.defs#savedFeedsPrefV2',
          items: [
            { type: 'feed', value: 'at://feed/1', pinned: true, id: '1' },
            { type: 'timeline', value: 'home', pinned: false, id: '2' },
          ],
        },
      ],
    };
    mockGetPreferences.mockResolvedValue(preferences);

    const feedMetadata = { uri: 'at://feed/1' } as unknown as BlueskyFeed;
    (useFeedGenerators as jest.Mock).mockReturnValue({
      data: { feeds: [feedMetadata] },
      isLoading: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSavedFeeds(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([
        { type: 'feed', value: 'at://feed/1', pinned: true, id: '1', metadata: feedMetadata },
        { type: 'timeline', value: 'home', pinned: false, id: '2', metadata: null },
      ]);
    });
  });

  it('combines loading and error states', async () => {
    mockGetPreferences.mockRejectedValue(new Error('fail'));
    (useFeedGenerators as jest.Mock).mockReturnValue({
      data: { feeds: [] },
      isLoading: true,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSavedFeeds(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
      expect((result.current.error as Error).message).toBe('fail');
    });
  });
});

