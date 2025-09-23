import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSavedFeeds } from '@/hooks/queries/usePreferences';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import type { SavedFeedWithMetadata } from '@/types/savedFeed';

const mockGetPreferences = jest.fn();
const mockGetFeedGenerators = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getPreferences: mockGetPreferences,
    getFeedGenerators: mockGetFeedGenerators,
  })),
}));

describe('useSavedFeeds query', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:example:123' },
    });
  });

  it('fetches saved feeds with metadata and caches result', async () => {
    mockGetPreferences.mockResolvedValue({
      preferences: [
        {
          $type: 'app.bsky.actor.defs#savedFeedsPrefV2',
          items: [
            { type: 'timeline', value: 'timeline', pinned: false, id: '1' },
            { type: 'feed', value: 'at://feed1', pinned: true, id: '2' },
          ],
        },
      ],
    });

    mockGetFeedGenerators.mockResolvedValue({
      feeds: [{ uri: 'at://feed1', displayName: 'Feed 1' }],
    });

    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSavedFeeds(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const expectedData: SavedFeedWithMetadata[] = [
      { type: 'timeline', value: 'timeline', pinned: false, id: '1', metadata: null },
      {
        type: 'feed',
        value: 'at://feed1',
        pinned: true,
        id: '2',
        metadata: { uri: 'at://feed1', displayName: 'Feed 1' },
      },
    ];

    expect(result.current.data).toEqual(expectedData);
    expect(queryClient.getQueryData(['savedFeeds', 'did:example:123'])).toEqual(expectedData);
    expect(mockGetPreferences).toHaveBeenCalledTimes(1);
    expect(mockGetFeedGenerators).toHaveBeenCalledWith('token', ['at://feed1']);
  });

  it('returns empty array when no saved feeds are configured', async () => {
    mockGetPreferences.mockResolvedValue({ preferences: [] });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSavedFeeds(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
    expect(mockGetFeedGenerators).not.toHaveBeenCalled();
  });

  it('retains cached data when refetch fails', async () => {
    mockGetPreferences.mockResolvedValue({
      preferences: [
        {
          $type: 'app.bsky.actor.defs#savedFeedsPrefV2',
          items: [{ type: 'feed', value: 'at://feed1', pinned: false, id: 'cached' }],
        },
      ],
    });

    mockGetFeedGenerators.mockResolvedValue({
      feeds: [{ uri: 'at://feed1', displayName: 'Feed 1' }],
    });

    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSavedFeeds(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const cachedData = result.current.data;

    mockGetPreferences.mockRejectedValueOnce(new Error('Network error'));
    mockGetFeedGenerators.mockRejectedValueOnce(new Error('Network error'));

    await queryClient.removeQueries({ queryKey: ['preferences'] });
    await queryClient.removeQueries({ queryKey: ['feedGenerators'] });

    const refetchResult = await result.current.refetch();

    expect(refetchResult.error).toBeInstanceOf(Error);
    expect(result.current.data).toEqual(cachedData);
  });
});

