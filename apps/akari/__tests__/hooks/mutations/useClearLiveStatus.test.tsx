import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useClearLiveStatus } from '@/hooks/mutations/useClearLiveStatus';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockClearActorStatus = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    clearActorStatus: mockClearActorStatus,
  })),
}));

describe('useClearLiveStatus mutation hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
    mockClearActorStatus.mockResolvedValue(undefined);
  });

  it('clears the live status and invalidates profile caches', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useClearLiveStatus(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockClearActorStatus).toHaveBeenCalledWith('token', 'did');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
  });

  it('throws when the token is missing', async () => {
    const { wrapper } = createWrapper();
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useClearLiveStatus(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockClearActorStatus).not.toHaveBeenCalled();
  });

  it('throws when the DID is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { result } = renderHook(() => useClearLiveStatus(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockClearActorStatus).not.toHaveBeenCalled();
  });

  it('throws when the PDS URL is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useClearLiveStatus(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockClearActorStatus).not.toHaveBeenCalled();
  });
});
