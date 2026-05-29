import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useDeactivateAccount } from '@/hooks/mutations/useDeactivateAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockDeactivateAccount = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    deactivateAccount: mockDeactivateAccount,
  })),
}));

describe('useDeactivateAccount mutation hook', () => {
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
    mockDeactivateAccount.mockResolvedValue(undefined);
  });

  it('deactivates the account with a scheduled delete date', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeactivateAccount(), { wrapper });

    result.current.mutate('2030-01-01T00:00:00.000Z');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockDeactivateAccount).toHaveBeenCalledWith('token', '2030-01-01T00:00:00.000Z');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile', 'did'] });
  });

  it('deactivates without a delete date (reversible)', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeactivateAccount(), { wrapper });

    result.current.mutate(undefined);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockDeactivateAccount).toHaveBeenCalledWith('token', undefined);
  });

  it('throws when the token is missing', async () => {
    const { wrapper } = createWrapper();
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useDeactivateAccount(), { wrapper });

    result.current.mutate(undefined);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockDeactivateAccount).not.toHaveBeenCalled();
  });

  it('throws when the PDS URL is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useDeactivateAccount(), { wrapper });

    result.current.mutate(undefined);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockDeactivateAccount).not.toHaveBeenCalled();
  });
});
