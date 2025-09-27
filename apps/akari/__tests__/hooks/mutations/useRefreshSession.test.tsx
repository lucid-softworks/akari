import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useRefreshSession } from '@/hooks/mutations/useRefreshSession';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockSetAuth = { mutate: jest.fn() };
const mockRefreshSession = jest.fn();

jest.mock('@/hooks/mutations/useSetAuthentication', () => ({
  useSetAuthentication: jest.fn(() => mockSetAuth),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    refreshSession: mockRefreshSession,
  })),
}));

describe('useRefreshSession mutation hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'url' } });
    mockRefreshSession.mockResolvedValue({
      accessJwt: 'token',
      refreshJwt: 'refresh',
      did: 'did',
      handle: 'handle',
    });
  });

  it('refreshes session and updates auth', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRefreshSession(), { wrapper });

    result.current.mutate({ refreshToken: 'refresh' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockRefreshSession).toHaveBeenCalledWith('refresh');
    expect(mockSetAuth.mutate).toHaveBeenCalledWith({
      token: 'token',
      refreshToken: 'refresh',
      did: 'did',
      handle: 'handle',
      pdsUrl: 'url',
    });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('throws if no PDS URL is available', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValueOnce({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRefreshSession(), { wrapper });

    result.current.mutate({ refreshToken: 'refresh' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toEqual(
      new Error('No PDS URL available for this account'),
    );
    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(mockSetAuth.mutate).not.toHaveBeenCalled();
  });
});

