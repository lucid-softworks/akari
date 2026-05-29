import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
}));

describe('useWipeAllData mutation hook', () => {
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

  it('removes all storage keys and clears the query cache', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(['accounts'], [{ did: '1' }]);
    queryClient.setQueryData(['currentAccount'], { did: '1' });
    queryClient.setQueryData(['jwtToken'], 't');
    queryClient.setQueryData(['refreshToken'], 'r');

    const { result } = renderHook(() => useWipeAllData(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(queryClient.getQueryData(['accounts'])).toBeUndefined());
    expect(queryClient.getQueryData(['currentAccount'])).toBeUndefined();
    expect(queryClient.getQueryData(['jwtToken'])).toBeUndefined();
    expect(queryClient.getQueryData(['refreshToken'])).toBeUndefined();
    expect(storage.removeItem).toHaveBeenCalledWith('accounts');
    expect(storage.removeItem).toHaveBeenCalledWith('currentAccount');
    expect(storage.removeItem).toHaveBeenCalledWith('jwtToken');
    expect(storage.removeItem).toHaveBeenCalledWith('refreshToken');
  });
});
