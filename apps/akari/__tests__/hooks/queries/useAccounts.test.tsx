import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAccounts } from '@/hooks/queries/useAccounts';
import { storage } from '@/utils/secureStorage';
import { Account } from '@/types/account';

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    getItem: jest.fn(),
  },
}));

const mockGetItem = storage.getItem as jest.Mock;

describe('useAccounts query hook', () => {
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

  it('returns stored accounts', async () => {
    const accounts: Account[] = [
      { did: 'did:1', handle: 'user', jwtToken: 't', refreshToken: 'r' },
    ];
    mockGetItem.mockReturnValue(accounts);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(accounts);
    expect(mockGetItem).toHaveBeenCalledWith('accounts');
  });

  it('handles missing accounts', async () => {
    mockGetItem.mockReturnValue(null);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
    expect(mockGetItem).toHaveBeenCalledWith('accounts');
  });
});

