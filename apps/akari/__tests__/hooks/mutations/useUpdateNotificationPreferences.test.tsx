import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateNotificationPreferences } from '@/hooks/mutations/useUpdateNotificationPreferences';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockPutNotificationPreferencesV2 = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    putNotificationPreferencesV2: mockPutNotificationPreferencesV2,
  })),
}));

describe('useUpdateNotificationPreferences mutation hook', () => {
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
    mockPutNotificationPreferencesV2.mockResolvedValue({});
  });

  it('patches notification preferences and invalidates the per-did prefs key', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const patch = { like: { list: true, push: false } } as any;
    const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper });

    result.current.mutate(patch);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPutNotificationPreferencesV2).toHaveBeenCalledWith('token', patch);
    expect(result.current.data).toEqual(patch);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['notifications', 'preferences', 'did', undefined],
    });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper });

    result.current.mutate({});

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockPutNotificationPreferencesV2).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper });

    result.current.mutate({});

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockPutNotificationPreferencesV2).not.toHaveBeenCalled();
  });
});
