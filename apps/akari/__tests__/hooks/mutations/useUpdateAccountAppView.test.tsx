import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUpdateAccountAppView } from '@/hooks/mutations/useUpdateAccountAppView';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('useUpdateAccountAppView mutation hook', () => {
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

  it('persists the override to the accounts list and current account', async () => {
    const { wrapper, queryClient } = createWrapper();
    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const accounts = [
      { did: 'a1', handle: 'h1' },
      { did: 'a2', handle: 'h2' },
    ];
    const current = { did: 'a1', handle: 'h1' };
    (storage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'accounts') return accounts;
      if (key === 'currentAccount') return current;
      return null;
    });

    const override = { did: 'did:appview' } as any;
    const { result } = renderHook(() => useUpdateAccountAppView(), { wrapper });

    result.current.mutate({ did: 'a1', override });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const expectedAccounts = [
      { did: 'a1', handle: 'h1', appView: override },
      { did: 'a2', handle: 'h2' },
    ];
    expect(storage.setItem).toHaveBeenCalledWith('accounts', expectedAccounts);
    expect(setQueryDataSpy).toHaveBeenCalledWith(['accounts'], expectedAccounts);
    expect(storage.setItem).toHaveBeenCalledWith('currentAccount', {
      did: 'a1',
      handle: 'h1',
      appView: override,
    });
    expect(setQueryDataSpy).toHaveBeenCalledWith(['currentAccount'], {
      did: 'a1',
      handle: 'h1',
      appView: override,
    });
    expect(invalidateSpy).toHaveBeenCalledWith();
  });

  it('does not touch the current account when a different DID is updated', async () => {
    const { wrapper } = createWrapper();
    const accounts = [{ did: 'a1', handle: 'h1' }];
    const current = { did: 'a2', handle: 'h2' };
    (storage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'accounts') return accounts;
      if (key === 'currentAccount') return current;
      return null;
    });

    const { result } = renderHook(() => useUpdateAccountAppView(), { wrapper });

    result.current.mutate({ did: 'a1', override: undefined });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(storage.setItem).toHaveBeenCalledWith('accounts', [
      { did: 'a1', handle: 'h1', appView: undefined },
    ]);
    expect(storage.setItem).not.toHaveBeenCalledWith('currentAccount', expect.anything());
  });

  it('handles an empty stored accounts list', async () => {
    const { wrapper } = createWrapper();
    (storage.getItem as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useUpdateAccountAppView(), { wrapper });

    result.current.mutate({ did: 'a1', override: undefined });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(storage.setItem).toHaveBeenCalledWith('accounts', []);
  });
});
