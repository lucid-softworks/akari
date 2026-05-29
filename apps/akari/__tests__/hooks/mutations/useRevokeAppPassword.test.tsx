import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useRevokeAppPassword } from '@/hooks/mutations/useRevokeAppPassword';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockRevokeAppPassword = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    revokeAppPassword: mockRevokeAppPassword,
  })),
}));

describe('useRevokeAppPassword mutation hook', () => {
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
    mockRevokeAppPassword.mockResolvedValue(undefined);
  });

  it('revokes the app password by name and returns the name', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRevokeAppPassword(), { wrapper });

    result.current.mutate('cli');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockRevokeAppPassword).toHaveBeenCalledWith('token', 'cli');
    expect(result.current.data).toBe('cli');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['appPasswords'] });
  });

  it('throws when the token is missing', async () => {
    const { wrapper } = createWrapper();
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useRevokeAppPassword(), { wrapper });

    result.current.mutate('cli');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockRevokeAppPassword).not.toHaveBeenCalled();
  });

  it('throws when the PDS URL is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useRevokeAppPassword(), { wrapper });

    result.current.mutate('cli');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockRevokeAppPassword).not.toHaveBeenCalled();
  });
});
