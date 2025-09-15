import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSavedFeeds } from '@/hooks/queries/usePreferences';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';

const mockGetPreferences = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/queries/useFeedGenerators', () => ({
  useFeedGenerators: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getPreferences: mockGetPreferences,
  })),
}));

describe('useSavedFeeds hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
  });

  it('returns saved feeds with metadata', async () => {
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

    (useFeedGenerators as jest.Mock).mockReturnValue({
      data: { feeds: [{ uri: 'at://feed1', displayName: 'Feed 1' }] },
      isLoading: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSavedFeeds(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toEqual({
      data: [
        { type: 'timeline', value: 'timeline', pinned: false, id: '1', metadata: null },
        {
          type: 'feed',
          value: 'at://feed1',
          pinned: true,
          id: '2',
          metadata: { uri: 'at://feed1', displayName: 'Feed 1' },
        },
      ],
      isLoading: false,
      error: null,
    });
  });

  it('returns empty list when preferences missing', async () => {
    mockGetPreferences.mockResolvedValue({ preferences: [] });
    (useFeedGenerators as jest.Mock).mockReturnValue({
      data: { feeds: [] },
      isLoading: false,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSavedFeeds(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toEqual({ data: [], isLoading: false, error: null });
  });
});

