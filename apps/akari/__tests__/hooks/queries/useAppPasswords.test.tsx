import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAppPasswords } from '@/hooks/queries/useAppPasswords';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockListAppPasswords = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    listAppPasswords: mockListAppPasswords,
  })),
}));

describe('useAppPasswords query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });
  });

  it('lists app passwords and unwraps the passwords array', async () => {
    const passwords = [{ name: 'phone', createdAt: '2024-01-01T00:00:00Z' }];
    mockListAppPasswords.mockResolvedValueOnce({ passwords });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAppPasswords(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockListAppPasswords).toHaveBeenCalledWith('token');
    expect(result.current.data).toEqual(passwords);
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAppPasswords(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListAppPasswords).not.toHaveBeenCalled();
  });

  it('is disabled when pdsUrl is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAppPasswords(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListAppPasswords).not.toHaveBeenCalled();
  });
});
