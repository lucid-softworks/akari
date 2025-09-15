import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useRefreshToken } from '@/hooks/queries/useRefreshToken';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    getItem: jest.fn(),
  },
}));

const mockGetItem = storage.getItem as jest.Mock;

describe('useRefreshToken query hook', () => {
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

  it('returns stored refresh token', async () => {
    mockGetItem.mockReturnValue('refresh-token');

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRefreshToken(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe('refresh-token');
    expect(mockGetItem).toHaveBeenCalledWith('refreshToken');
  });

  it('handles missing refresh token', async () => {
    mockGetItem.mockReturnValue(null);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRefreshToken(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
    expect(mockGetItem).toHaveBeenCalledWith('refreshToken');
  });
});

