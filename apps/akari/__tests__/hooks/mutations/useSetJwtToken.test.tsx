import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSetJwtToken } from '@/hooks/mutations/useSetJwtToken';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
}));

describe('useSetJwtToken mutation hook', () => {
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

  it('stores the token in cache and secureStorage', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetJwtToken(), { wrapper });

    result.current.mutate('abc');

    await waitFor(() => expect(queryClient.getQueryData(['jwtToken'])).toBe('abc'));
    expect(storage.setItem).toHaveBeenCalledWith('jwtToken', 'abc');
  });
});
