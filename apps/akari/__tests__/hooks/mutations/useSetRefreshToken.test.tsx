import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSetRefreshToken } from '@/hooks/mutations/useSetRefreshToken';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
}));

describe('useSetRefreshToken mutation hook', () => {
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

  it('stores the refresh token in cache and secureStorage', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetRefreshToken(), { wrapper });

    result.current.mutate('def');

    await waitFor(() => expect(queryClient.getQueryData(['refreshToken'])).toBe('def'));
    expect(storage.setItem).toHaveBeenCalledWith('refreshToken', 'def');
  });
});
