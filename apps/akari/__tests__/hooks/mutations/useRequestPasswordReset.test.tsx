import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useRequestPasswordReset } from '@/hooks/mutations/useRequestPasswordReset';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';

const mockRequestPasswordReset = jest.fn();

jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

describe('useRequestPasswordReset mutation hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    (apiForAccount as jest.Mock).mockReturnValue({
      requestPasswordReset: mockRequestPasswordReset,
    });
    mockRequestPasswordReset.mockResolvedValue(undefined);
  });

  it('requests a password reset for the given email', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    result.current.mutate('user@example.com');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com');
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });

    result.current.mutate('user@example.com');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });
});
