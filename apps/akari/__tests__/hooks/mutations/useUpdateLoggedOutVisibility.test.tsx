import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateLoggedOutVisibility } from '@/hooks/mutations/useUpdateLoggedOutVisibility';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockSetLoggedOutVisibilityDiscouraged = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    setLoggedOutVisibilityDiscouraged: mockSetLoggedOutVisibilityDiscouraged,
  })),
}));

describe('useUpdateLoggedOutVisibility mutation hook', () => {
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
    mockSetLoggedOutVisibilityDiscouraged.mockResolvedValue(undefined);
  });

  it('sets the no-unauthenticated label and invalidates the profile', async () => {
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateLoggedOutVisibility(), { wrapper });

    result.current.mutate(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockSetLoggedOutVisibilityDiscouraged).toHaveBeenCalledWith('token', 'did', true);
    expect(result.current.data).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateLoggedOutVisibility(), { wrapper });

    result.current.mutate(false);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockSetLoggedOutVisibilityDiscouraged).not.toHaveBeenCalled();
  });

  it('errors when DID missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateLoggedOutVisibility(), { wrapper });

    result.current.mutate(false);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockSetLoggedOutVisibilityDiscouraged).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateLoggedOutVisibility(), { wrapper });

    result.current.mutate(false);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockSetLoggedOutVisibilityDiscouraged).not.toHaveBeenCalled();
  });
});
