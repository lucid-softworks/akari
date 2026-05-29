import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdatePostInteractionSettings } from '@/hooks/mutations/useUpdatePostInteractionSettings';
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

const PREF_TYPE = 'app.bsky.actor.defs#postInteractionSettingsPref';

describe('useUpdatePostInteractionSettings mutation hook', () => {
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

  it('encodes anyone-mode with no rules and allowed quotes', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const input = {
      mode: 'anyone' as const,
      followers: false,
      following: false,
      mentioned: false,
      allowQuotes: true,
      allowedLists: [],
    };
    const { result } = renderHook(() => useUpdatePostInteractionSettings(), { wrapper });

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // no threadgate rules (undefined) and quotes allowed -> empty pref body.
    expect(mockPutPreferences).toHaveBeenCalledWith('token', [{ $type: PREF_TYPE }]);
    expect(result.current.data).toEqual(input);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['preferences'] });
  });

  it('encodes nobody-mode as an empty allow-rules array', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdatePostInteractionSettings(), { wrapper });

    result.current.mutate({
      mode: 'nobody',
      followers: true,
      following: true,
      mentioned: true,
      allowQuotes: true,
      allowedLists: ['at://list/1'],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPutPreferences).toHaveBeenCalledWith('token', [
      { $type: PREF_TYPE, threadgateAllowRules: [] },
    ]);
  });

  it('encodes follower/following/mention/list rules and disables quotes', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdatePostInteractionSettings(), { wrapper });

    result.current.mutate({
      mode: 'anyone',
      followers: true,
      following: true,
      mentioned: true,
      allowQuotes: false,
      allowedLists: ['at://list/1', 'at://list/2'],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPutPreferences).toHaveBeenCalledWith('token', [
      {
        $type: PREF_TYPE,
        threadgateAllowRules: [
          { $type: 'app.bsky.feed.threadgate#followerRule' },
          { $type: 'app.bsky.feed.threadgate#followingRule' },
          { $type: 'app.bsky.feed.threadgate#mentionRule' },
          { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/1' },
          { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/2' },
        ],
        postgateEmbeddingRules: [{ $type: 'app.bsky.feed.postgate#disableRule' }],
      },
    ]);
  });

  it('replaces an existing pref slot, preserving others', async () => {
    const { wrapper } = createWrapper();
    const other = { $type: 'app.bsky.actor.defs#adultContentPref', enabled: false };
    mockGetPreferences.mockResolvedValueOnce({
      preferences: [other, { $type: PREF_TYPE, threadgateAllowRules: [] }],
    });
    const { result } = renderHook(() => useUpdatePostInteractionSettings(), { wrapper });

    result.current.mutate({
      mode: 'anyone',
      followers: false,
      following: false,
      mentioned: false,
      allowQuotes: true,
      allowedLists: [],
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPutPreferences).toHaveBeenCalledWith('token', [other, { $type: PREF_TYPE }]);
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdatePostInteractionSettings(), { wrapper });

    result.current.mutate({
      mode: 'anyone',
      followers: false,
      following: false,
      mentioned: false,
      allowQuotes: true,
      allowedLists: [],
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdatePostInteractionSettings(), { wrapper });

    result.current.mutate({
      mode: 'anyone',
      followers: false,
      following: false,
      mentioned: false,
      allowQuotes: true,
      allowedLists: [],
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });
});
