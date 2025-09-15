import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { storage } from '@/utils/secureStorage';
import { Account } from '@/types/account';

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    getItem: jest.fn(),
  },
}));

const mockGetItem = storage.getItem as jest.Mock;

describe('useCurrentAccount query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns stored current account', async () => {
    const account: Account = {
      did: 'did:1',
      handle: 'user',
      jwtToken: 't',
      refreshToken: 'r',
    };
    mockGetItem.mockReturnValue(account);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentAccount(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(account);
    expect(mockGetItem).toHaveBeenCalledWith('currentAccount');
  });

  it('handles missing current account', async () => {
    mockGetItem.mockReturnValue(null);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCurrentAccount(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
    expect(mockGetItem).toHaveBeenCalledWith('currentAccount');
  });
});
