import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import type { Account } from '@/types/account';

const mockSetAuth = jest.fn();
const mockSetCurrent = jest.fn();

jest.mock('@/hooks/mutations/useSetAuthentication', () => ({
  useSetAuthentication: () => ({ mutateAsync: mockSetAuth }),
}));
jest.mock('@/hooks/mutations/useSetCurrentAccount', () => ({
  useSetCurrentAccount: () => ({ mutateAsync: mockSetCurrent }),
}));

describe('useSwitchAccount mutation hook', () => {
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
    mockSetAuth.mockResolvedValue(undefined);
    mockSetCurrent.mockResolvedValue(undefined);
  });

  it('sets current account, applies auth data, and invalidates account-scoped caches', async () => {
    const { queryClient, wrapper } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const account = {
      did: '3',
      handle: 'h3',
      jwtToken: 't',
      refreshToken: 'r',
      pdsUrl: 'url',
    } as Account;

    const { result } = renderHook(() => useSwitchAccount(), { wrapper });
    result.current.mutate(account);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetCurrent).toHaveBeenCalledWith(account);
    expect(mockSetAuth).toHaveBeenCalledWith({
      token: 't',
      refreshToken: 'r',
      did: '3',
      handle: 'h3',
      pdsUrl: 'url',
      displayName: null,
      avatar: null,
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['profile', '3'] });
  });
});
