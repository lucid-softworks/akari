import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateFeedViewPref } from '@/hooks/mutations/useUpdateFeedViewPref';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetPreferences = jest.fn();
const mockPutPreferences = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getPreferences: mockGetPreferences,
    putPreferences: mockPutPreferences,
  })),
}));

const PREF_TYPE = 'app.bsky.actor.defs#feedViewPref';

describe('useUpdateFeedViewPref mutation hook', () => {
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
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did', pdsUrl: 'https://pds' } });
    mockGetPreferences.mockResolvedValue({ preferences: [] });
    mockPutPreferences.mockResolvedValue({});
  });

  it('merges the patch onto the existing entry for the feed', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const otherFeed = { $type: PREF_TYPE, feed: 'at://feed/x', hideReplies: true };
    const existing = { $type: PREF_TYPE, feed: 'home', hideReplies: true, hideReposts: false };
    mockGetPreferences.mockResolvedValueOnce({ preferences: [otherFeed, existing] });
    const { result } = renderHook(() => useUpdateFeedViewPref(), { wrapper });

    result.current.mutate({ feed: 'home', patch: { hideReposts: true } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // other-feed entry preserved; the home entry merged.
    expect(mockPutPreferences).toHaveBeenCalledWith('token', [
      otherFeed,
      { $type: PREF_TYPE, feed: 'home', hideReplies: true, hideReposts: true },
    ]);
    expect(result.current.data).toEqual({
      $type: PREF_TYPE,
      feed: 'home',
      hideReplies: true,
      hideReposts: true,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['preferences'] });
  });

  it('inserts a new entry when the feed has none', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateFeedViewPref(), { wrapper });

    result.current.mutate({ feed: 'home', patch: { hideReplies: true } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPutPreferences).toHaveBeenCalledWith('token', [
      { $type: PREF_TYPE, feed: 'home', hideReplies: true },
    ]);
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateFeedViewPref(), { wrapper });

    result.current.mutate({ feed: 'home', patch: {} });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateFeedViewPref(), { wrapper });

    result.current.mutate({ feed: 'home', patch: {} });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });
});
