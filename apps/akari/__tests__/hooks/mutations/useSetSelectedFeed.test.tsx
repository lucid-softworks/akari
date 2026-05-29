import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
}));

describe('useSetSelectedFeed mutation hook', () => {
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

  it('stores the selected feed in cache and secureStorage', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useSetSelectedFeed(), { wrapper });

    result.current.mutate('at://feed');

    await waitFor(() => expect(queryClient.getQueryData(['selectedFeed'])).toBe('at://feed'));
    expect(storage.setItem).toHaveBeenCalledWith('selectedFeed', 'at://feed');
  });
});
