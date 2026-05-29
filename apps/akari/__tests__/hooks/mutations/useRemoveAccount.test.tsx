import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import type { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
}));

describe('useRemoveAccount mutation hook', () => {
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

  it('removes the account and promotes the next as current', async () => {
    const { queryClient, wrapper } = createWrapper();
    const accounts = [
      { did: '1', handle: 'h1' },
      { did: '2', handle: 'h2' },
    ] as Account[];
    queryClient.setQueryData(['accounts'], accounts);
    queryClient.setQueryData(['currentAccount'], accounts[0]);
    (storage.getItem as jest.Mock).mockReturnValue(accounts);

    const { result } = renderHook(() => useRemoveAccount(), { wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(queryClient.getQueryData(['accounts'])).toEqual([accounts[1]]));
    expect(queryClient.getQueryData(['currentAccount'])).toEqual(accounts[1]);
    expect(storage.setItem).toHaveBeenCalledWith('currentAccount', accounts[1]);
    expect(storage.setItem).toHaveBeenCalledWith('accounts', [accounts[1]]);
  });

  it('sets current account to null when removing the only account', async () => {
    const { queryClient, wrapper } = createWrapper();
    const accounts = [{ did: '1', handle: 'h1' }] as Account[];
    queryClient.setQueryData(['accounts'], accounts);
    queryClient.setQueryData(['currentAccount'], accounts[0]);
    (storage.getItem as jest.Mock).mockReturnValue(accounts);

    const { result } = renderHook(() => useRemoveAccount(), { wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(queryClient.getQueryData(['accounts'])).toEqual([]));
    expect(queryClient.getQueryData(['currentAccount'])).toBeNull();
    expect(storage.setItem).toHaveBeenCalledWith('currentAccount', null);
  });

  it('leaves current account untouched when removing a different account', async () => {
    const { queryClient, wrapper } = createWrapper();
    const accounts = [
      { did: '1', handle: 'h1' },
      { did: '2', handle: 'h2' },
    ] as Account[];
    queryClient.setQueryData(['accounts'], accounts);
    queryClient.setQueryData(['currentAccount'], accounts[0]);
    (storage.getItem as jest.Mock).mockReturnValue(accounts);

    const { result } = renderHook(() => useRemoveAccount(), { wrapper });
    result.current.mutate('2');

    await waitFor(() => expect(queryClient.getQueryData(['accounts'])).toEqual([accounts[0]]));
    expect(queryClient.getQueryData(['currentAccount'])).toEqual(accounts[0]);
    expect(storage.setItem).not.toHaveBeenCalledWith('currentAccount', expect.anything());
  });
});
