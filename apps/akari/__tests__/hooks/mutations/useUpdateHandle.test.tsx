import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateHandle } from '@/hooks/mutations/useUpdateHandle';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockUpdateHandle = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    updateHandle: mockUpdateHandle,
  })),
}));

describe('useUpdateHandle mutation hook', () => {
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
    mockUpdateHandle.mockResolvedValue(undefined);
  });

  it('updates the handle, returns it, and invalidates identity caches', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateHandle(), { wrapper });

    result.current.mutate('newhandle.bsky.social');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUpdateHandle).toHaveBeenCalledWith('token', 'newhandle.bsky.social');
    expect(result.current.data).toBe('newhandle.bsky.social');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['currentAccount'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });

  it('surfaces the error when the PDS rejects the handle', async () => {
    const { wrapper } = createWrapper();
    mockUpdateHandle.mockRejectedValueOnce(new Error('handle unavailable'));
    const { result } = renderHook(() => useUpdateHandle(), { wrapper });

    result.current.mutate('taken.bsky.social');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('handle unavailable');
  });

  it('throws when the token is missing', async () => {
    const { wrapper } = createWrapper();
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useUpdateHandle(), { wrapper });

    result.current.mutate('newhandle.bsky.social');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockUpdateHandle).not.toHaveBeenCalled();
  });

  it('throws when the PDS URL is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useUpdateHandle(), { wrapper });

    result.current.mutate('newhandle.bsky.social');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockUpdateHandle).not.toHaveBeenCalled();
  });
});
