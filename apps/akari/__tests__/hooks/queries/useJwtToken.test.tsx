import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { storage } from '@/utils/secureStorage';

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    getItem: jest.fn(),
  },
}));

const mockGetItem = storage.getItem as jest.Mock;

describe('useJwtToken query hook', () => {
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

  it('returns stored JWT token', async () => {
    mockGetItem.mockReturnValue('token');

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useJwtToken(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe('token');
    expect(mockGetItem).toHaveBeenCalledWith('jwtToken');
  });

  it('returns null when token is missing', async () => {
    mockGetItem.mockReturnValue(null);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useJwtToken(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
    expect(mockGetItem).toHaveBeenCalledWith('jwtToken');
  });
});
