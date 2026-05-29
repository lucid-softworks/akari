import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useClearAuthentication } from '@/hooks/mutations/useClearAuthentication';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
}));

describe('useClearAuthentication mutation hook', () => {
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

  it('clears tokens from cache and storage and invalidates auth queries', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(['jwtToken'], 'old');
    queryClient.setQueryData(['refreshToken'], 'old');
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useClearAuthentication(), { wrapper });
    result.current.mutate();

    await waitFor(() => expect(queryClient.getQueryData(['jwtToken'])).toBeNull());
    expect(queryClient.getQueryData(['refreshToken'])).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('jwtToken');
    expect(storage.removeItem).toHaveBeenCalledWith('refreshToken');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['auth'] });
  });
});
