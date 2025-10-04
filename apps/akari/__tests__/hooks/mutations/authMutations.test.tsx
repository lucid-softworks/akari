import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSetJwtToken } from '@/hooks/mutations/useSetJwtToken';
import { useSetRefreshToken } from '@/hooks/mutations/useSetRefreshToken';
import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { useClearAuthentication } from '@/hooks/mutations/useClearAuthentication';
import { useSetCurrentAccount } from '@/hooks/mutations/useSetCurrentAccount';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';

import { storage } from '@/utils/secureStorage';
jest.mock('@/utils/secureStorage', () => ({
  storage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('authentication and account mutation hooks', () => {
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

  it('useSetJwtToken stores token', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetJwtToken(), { wrapper });

    result.current.mutate('abc');

    await waitFor(() => {
      expect(queryClient.getQueryData(['jwtToken'])).toBe('abc');
    });

    expect(storage.setItem).toHaveBeenCalledWith('jwtToken', 'abc');
  });

  it('useSetRefreshToken stores token', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetRefreshToken(), { wrapper });

    result.current.mutate('def');

    await waitFor(() => {
      expect(queryClient.getQueryData(['refreshToken'])).toBe('def');
    });

    expect(storage.setItem).toHaveBeenCalledWith('refreshToken', 'def');
  });

  it('useSetAuthentication sets all auth data', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetAuthentication(), { wrapper });

    result.current.mutate({
      token: 't',
      refreshToken: 'r',
      did: 'did',
      handle: 'handle',
      pdsUrl: 'url',
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(['jwtToken'])).toBe('t');
    });
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
    expect(storage.setItem).toHaveBeenCalledWith(
      'accounts',
      [expect.objectContaining({ did: 'did', handle: 'handle' })],
    );
  });

  it('useClearAuthentication clears auth data', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(['jwtToken'], 'old');
    queryClient.setQueryData(['refreshToken'], 'old');

    const { result } = renderHook(() => useClearAuthentication(), { wrapper });
    result.current.mutate();

    await waitFor(() => {
      expect(queryClient.getQueryData(['jwtToken'])).toBeNull();
    });
    expect(queryClient.getQueryData(['refreshToken'])).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('jwtToken');
    expect(storage.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('useSetCurrentAccount stores account', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetCurrentAccount(), { wrapper });
    const account = { did: '1', handle: 'h', jwtToken: 't', refreshToken: 'r' };

    result.current.mutate(account);

    await waitFor(() => {
      expect(queryClient.getQueryData(['currentAccount'])).toEqual(account);
    });
    expect(storage.setItem).toHaveBeenCalledWith('currentAccount', account);
  });

  it('useSetSelectedFeed stores feed', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetSelectedFeed(), { wrapper });

    result.current.mutate('feed');

    await waitFor(() => {
      expect(queryClient.getQueryData(['selectedFeed'])).toBe('feed');
    });
    expect(storage.setItem).toHaveBeenCalledWith('selectedFeed', 'feed');
  });

  it('useRemoveAccount removes account and updates current', async () => {
    const { queryClient, wrapper } = createWrapper();
    const accounts = [{ did: '1', handle: 'h1' }, { did: '2', handle: 'h2' }];
    queryClient.setQueryData(['accounts'], accounts);
    queryClient.setQueryData(['currentAccount'], accounts[0]);
    (storage.getItem as jest.Mock).mockReturnValue(accounts);

    const { result } = renderHook(() => useRemoveAccount(), { wrapper });
    result.current.mutate('1');

    await waitFor(() => {
      expect(queryClient.getQueryData(['accounts'])).toEqual([accounts[1]]);
    });
    expect(queryClient.getQueryData(['currentAccount'])).toEqual(accounts[1]);
    expect(storage.setItem).toHaveBeenCalledWith('currentAccount', accounts[1]);
    expect(storage.setItem).toHaveBeenCalledWith('accounts', [accounts[1]]);
  });

  it('useSwitchAccount switches account and sets auth', async () => {
    const setAuth = jest
      .spyOn(require('@/hooks/mutations/useSetAuthentication'), 'useSetAuthentication')
      .mockReturnValue({ mutateAsync: jest.fn() });
    const setCurrent = jest
      .spyOn(require('@/hooks/mutations/useSetCurrentAccount'), 'useSetCurrentAccount')
      .mockReturnValue({ mutateAsync: jest.fn() });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSwitchAccount(), { wrapper });
    const account = {
      did: '3',
      handle: 'h3',
      jwtToken: 't',
      refreshToken: 'r',
      pdsUrl: 'url',
    } as any;

    result.current.mutate(account);

    await waitFor(() => {
      expect(setCurrent().mutateAsync).toHaveBeenCalledWith(account);
    });
    expect(setAuth().mutateAsync).toHaveBeenCalledWith({
      token: 't',
      refreshToken: 'r',
      did: '3',
      handle: 'h3',
      pdsUrl: 'url',
      displayName: null,
      avatar: null,
    });
  });

  it('useWipeAllData clears everything', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(['accounts'], [{ did: '1' }]);
    queryClient.setQueryData(['currentAccount'], { did: '1' });
    queryClient.setQueryData(['jwtToken'], 't');
    queryClient.setQueryData(['refreshToken'], 'r');

    const { result } = renderHook(() => useWipeAllData(), { wrapper });
    result.current.mutate();

    await waitFor(() => {
      expect(queryClient.getQueryData(['accounts'])).toEqual([]);
    });
    expect(queryClient.getQueryData(['currentAccount'])).toBeNull();
    expect(queryClient.getQueryData(['jwtToken'])).toBeNull();
    expect(queryClient.getQueryData(['refreshToken'])).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('accounts');
    expect(storage.removeItem).toHaveBeenCalledWith('currentAccount');
    expect(storage.removeItem).toHaveBeenCalledWith('jwtToken');
    expect(storage.removeItem).toHaveBeenCalledWith('refreshToken');
  });
});

