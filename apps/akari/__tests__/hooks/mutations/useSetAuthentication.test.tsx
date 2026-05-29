import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import type { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
}));

describe('useSetAuthentication mutation hook', () => {
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

  it('sets all auth data in cache and storage, adding a new account', async () => {
    const { queryClient, wrapper } = createWrapper();
    (storage.getItem as jest.Mock).mockReturnValue(undefined);
    const { result } = renderHook(() => useSetAuthentication(), { wrapper });

    result.current.mutate({
      token: 't',
      refreshToken: 'r',
      did: 'did',
      handle: 'handle',
      pdsUrl: 'url',
    });

    await waitFor(() => expect(queryClient.getQueryData(['jwtToken'])).toBe('t'));
    expect(queryClient.getQueryData(['refreshToken'])).toBe('r');
    expect(queryClient.getQueryData(['currentAccount'])).toMatchObject({
      did: 'did',
      handle: 'handle',
      jwtToken: 't',
      refreshToken: 'r',
      pdsUrl: 'url',
    });
    expect(queryClient.getQueryData(['accounts'])).toEqual([
      expect.objectContaining({ did: 'did', handle: 'handle' }),
    ]);
    expect(storage.setItem).toHaveBeenCalledWith('jwtToken', 't');
    expect(storage.setItem).toHaveBeenCalledWith('refreshToken', 'r');
    expect(storage.setItem).toHaveBeenCalledWith(
      'currentAccount',
      expect.objectContaining({ did: 'did', handle: 'handle' }),
    );
    expect(storage.setItem).toHaveBeenCalledWith('accounts', [
      expect.objectContaining({ did: 'did', handle: 'handle' }),
    ]);
  });

  it('merges into an existing account with the same DID rather than appending', async () => {
    const { queryClient, wrapper } = createWrapper();
    const existing: Account = {
      did: 'did',
      handle: 'old',
      jwtToken: 'oldT',
      refreshToken: 'oldR',
    } as Account;
    queryClient.setQueryData(['accounts'], [existing]);
    // Seed the currentAccount cache so the merge preserves prior display fields.
    queryClient.setQueryData(['currentAccount'], { ...existing, displayName: 'Name', avatar: 'av' });
    (storage.getItem as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useSetAuthentication(), { wrapper });
    result.current.mutate({ token: 't', refreshToken: 'r', did: 'did', handle: 'new' });

    await waitFor(() => expect(queryClient.getQueryData(['jwtToken'])).toBe('t'));
    const accounts = queryClient.getQueryData<Account[]>(['accounts']);
    expect(accounts).toHaveLength(1);
    expect(accounts?.[0]).toMatchObject({
      did: 'did',
      handle: 'new',
      jwtToken: 't',
      displayName: 'Name',
      avatar: 'av',
    });
  });
});
