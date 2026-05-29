import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useDeleteAccount, useRequestAccountDelete } from '@/hooks/mutations/useDeleteAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockDeleteAccount = jest.fn();
const mockRequestAccountDelete = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    deleteAccount: mockDeleteAccount,
    requestAccountDelete: mockRequestAccountDelete,
  })),
}));

describe('useDeleteAccount mutation hook', () => {
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
    mockDeleteAccount.mockResolvedValue(undefined);
    mockRequestAccountDelete.mockResolvedValue(undefined);
  });

  describe('useRequestAccountDelete', () => {
    it('emails a confirmation token and invalidates pds preferences', async () => {
      const { queryClient, wrapper } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useRequestAccountDelete(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockRequestAccountDelete).toHaveBeenCalledWith('token');
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['preferences', 'https://pds', undefined],
      });
    });

    it('throws when the token is missing', async () => {
      const { wrapper } = createWrapper();
      (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
      const { result } = renderHook(() => useRequestAccountDelete(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(mockRequestAccountDelete).not.toHaveBeenCalled();
    });

    it('throws when the PDS URL is missing', async () => {
      const { wrapper } = createWrapper();
      (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
      const { result } = renderHook(() => useRequestAccountDelete(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(mockRequestAccountDelete).not.toHaveBeenCalled();
    });
  });

  it('deletes the account and invalidates every query', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });

    result.current.mutate({ password: 'pw', token: 'email-token' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockDeleteAccount).toHaveBeenCalledWith('did', 'pw', 'email-token');
    expect(invalidateSpy).toHaveBeenCalledWith();
  });

  it('throws when the DID is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });

    result.current.mutate({ password: 'pw', token: 'email-token' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('throws when the PDS URL is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useDeleteAccount(), { wrapper });

    result.current.mutate({ password: 'pw', token: 'email-token' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });
});
