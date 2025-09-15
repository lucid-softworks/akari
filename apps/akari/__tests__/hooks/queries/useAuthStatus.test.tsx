import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useRefreshToken } from '@/hooks/queries/useRefreshToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockRefreshSession = jest.fn();
const mockSetAuth = { mutate: jest.fn() };
const mockClearAuth = { mutate: jest.fn() };

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useRefreshToken', () => ({
  useRefreshToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/mutations/useSetAuthentication', () => ({
  useSetAuthentication: jest.fn(() => mockSetAuth),
}));

jest.mock('@/hooks/mutations/useClearAuthentication', () => ({
  useClearAuthentication: jest.fn(() => mockClearAuth),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    refreshSession: mockRefreshSession,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

describe('useAuthStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns not authenticated when tokens are missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    (useRefreshToken as jest.Mock).mockReturnValue({ data: undefined });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: null });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({ isAuthenticated: false });
    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(mockSetAuth.mutate).not.toHaveBeenCalled();
    expect(mockClearAuth.mutate).not.toHaveBeenCalled();
  });

  it('refreshes session and returns authenticated user', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useRefreshToken as jest.Mock).mockReturnValue({ data: 'refresh' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did' },
    });
    mockRefreshSession.mockResolvedValue({
      accessJwt: 'newToken',
      refreshJwt: 'newRefresh',
      did: 'did',
      handle: 'handle',
      email: 'email',
      active: true,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockRefreshSession).toHaveBeenCalledWith('refresh');
    expect(mockSetAuth.mutate).toHaveBeenCalledWith({
      token: 'newToken',
      refreshToken: 'newRefresh',
      did: 'did',
      handle: 'handle',
      pdsUrl: 'https://pds',
    });
    expect(result.current.data).toEqual({
      isAuthenticated: true,
      user: {
        did: 'did',
        handle: 'handle',
        email: 'email',
        active: true,
        status: undefined,
      },
    });
    expect(mockClearAuth.mutate).not.toHaveBeenCalled();
  });

  it('clears auth on refresh failure', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useRefreshToken as jest.Mock).mockReturnValue({ data: 'refresh' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did' },
    });
    mockRefreshSession.mockRejectedValue(new Error('boom'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockRefreshSession).toHaveBeenCalledWith('refresh');
    expect(mockClearAuth.mutate).toHaveBeenCalled();
    expect(mockSetAuth.mutate).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ isAuthenticated: false });
  });
});

