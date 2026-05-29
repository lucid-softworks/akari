import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateInterests } from '@/hooks/mutations/useUpdateInterests';
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

const PREF_TYPE = 'app.bsky.actor.defs#interestsPref';

describe('useUpdateInterests mutation hook', () => {
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

  it('swaps the interests slot and puts the merged list back', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const other = { $type: 'app.bsky.actor.defs#adultContentPref', enabled: false };
    mockGetPreferences.mockResolvedValueOnce({
      preferences: [other, { $type: PREF_TYPE, tags: ['art'] }],
    });
    const { result } = renderHook(() => useUpdateInterests(), { wrapper });

    result.current.mutate((current) => [...current, 'music']);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPutPreferences).toHaveBeenCalledWith('token', [
      other,
      { $type: PREF_TYPE, tags: ['art', 'music'] },
    ]);
    expect(result.current.data).toEqual(['art', 'music']);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['preferences'] });
  });

  it('defaults to an empty list when no existing pref', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateInterests(), { wrapper });

    result.current.mutate(() => ['tech']);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPutPreferences).toHaveBeenCalledWith('token', [{ $type: PREF_TYPE, tags: ['tech'] }]);
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateInterests(), { wrapper });

    result.current.mutate(() => ['x']);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateInterests(), { wrapper });

    result.current.mutate(() => ['x']);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });
});
