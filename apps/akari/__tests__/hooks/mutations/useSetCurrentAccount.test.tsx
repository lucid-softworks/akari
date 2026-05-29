import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSetCurrentAccount } from '@/hooks/mutations/useSetCurrentAccount';
import type { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
}));

describe('useSetCurrentAccount mutation hook', () => {
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

  it('stores the account in cache and secureStorage', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetCurrentAccount(), { wrapper });
    const account = { did: '1', handle: 'h', jwtToken: 't', refreshToken: 'r' } as Account;

    result.current.mutate(account);

    await waitFor(() => expect(queryClient.getQueryData(['currentAccount'])).toEqual(account));
    expect(storage.setItem).toHaveBeenCalledWith('currentAccount', account);
  });
});
