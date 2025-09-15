import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetUnreadNotificationsCount = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getUnreadNotificationsCount: mockGetUnreadNotificationsCount,
  })),
}));

describe('useUnreadNotificationsCount', () => {
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
      data: { did: 'did:123', pdsUrl: 'https://pds' },
    });
  });

  it('returns unread notifications count', async () => {
    mockGetUnreadNotificationsCount.mockResolvedValue({ count: 3 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUnreadNotificationsCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBe(3);
    });
    expect(mockGetUnreadNotificationsCount).toHaveBeenCalledWith('token');
  });

  it('returns 0 when API call fails', async () => {
    mockGetUnreadNotificationsCount.mockRejectedValue(new Error('network'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUnreadNotificationsCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBe(0);
    });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not run query without token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUnreadNotificationsCount(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetUnreadNotificationsCount).not.toHaveBeenCalled();
  });

  it('does not run when disabled', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUnreadNotificationsCount(false), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });
    expect(mockGetUnreadNotificationsCount).not.toHaveBeenCalled();
  });
});

