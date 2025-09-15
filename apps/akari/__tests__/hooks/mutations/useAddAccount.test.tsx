import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('useAddAccount', () => {
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
  });

  it('adds first account and persists to storage', async () => {
    const { queryClient, wrapper } = createWrapper();
    (storage.getItem as jest.Mock).mockReturnValue(undefined);
    const { result } = renderHook(() => useAddAccount(), { wrapper });
    const account = { did: 'a1', handle: 'h1' } as any;

    result.current.mutate(account);

    await waitFor(() => {
      expect(queryClient.getQueryData(['accounts'])).toEqual([account]);
    });
    expect(storage.setItem).toHaveBeenCalledWith('accounts', [account]);
  });

  it('appends account when existing accounts are present', async () => {
    const { queryClient, wrapper } = createWrapper();
    const existingQueryAccounts = [{ did: 'q1', handle: 'hq1' } as any];
    const existingStoredAccounts = [{ did: 's1', handle: 'hs1' } as any];

    queryClient.setQueryData(['accounts'], existingQueryAccounts);
    (storage.getItem as jest.Mock).mockReturnValue(existingStoredAccounts);

    const { result } = renderHook(() => useAddAccount(), { wrapper });
    const newAccount = { did: 'a2', handle: 'h2' } as any;

    result.current.mutate(newAccount);

    await waitFor(() => {
      expect(queryClient.getQueryData(['accounts'])).toEqual([
        ...existingQueryAccounts,
        newAccount,
      ]);
    });
    expect(storage.getItem).toHaveBeenCalledWith('accounts');
    expect(storage.setItem).toHaveBeenCalledWith('accounts', [
      ...existingStoredAccounts,
      newAccount,
    ]);
  });
});
