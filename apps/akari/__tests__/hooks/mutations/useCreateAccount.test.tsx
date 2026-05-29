import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCreateAccount } from '@/hooks/mutations/useCreateAccount';

const mockSetAuth = { mutateAsync: jest.fn() };
const mockCreateAccount = jest.fn();
const mockGetProfile = jest.fn();

jest.mock('@/hooks/mutations/useSetAuthentication', () => ({
  useSetAuthentication: jest.fn(() => mockSetAuth),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createAccount: mockCreateAccount,
    getProfile: mockGetProfile,
  })),
}));

describe('useCreateAccount mutation hook', () => {
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
    mockCreateAccount.mockResolvedValue({
      accessJwt: 'token',
      refreshJwt: 'refresh',
      did: 'did',
      handle: 'handle',
    });
    mockGetProfile.mockResolvedValue({
      did: 'did',
      handle: 'handle',
      displayName: 'Display Name',
      avatar: 'https://avatar.test/img.png',
      indexedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('creates an account and stores auth data with profile metadata', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateAccount(), { wrapper });

    result.current.mutate({
      email: 'a@b.com',
      handle: 'handle',
      password: 'pass',
      inviteCode: 'code',
      pdsUrl: 'https://pds',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateAccount).toHaveBeenCalledWith({
      email: 'a@b.com',
      handle: 'handle',
      password: 'pass',
      inviteCode: 'code',
    });
    expect(mockGetProfile).toHaveBeenCalledWith('token', 'did');
    expect(mockSetAuth.mutateAsync).toHaveBeenCalledWith({
      token: 'token',
      refreshToken: 'refresh',
      did: 'did',
      handle: 'handle',
      pdsUrl: 'https://pds',
      displayName: 'Display Name',
      avatar: 'https://avatar.test/img.png',
    });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('falls back to handle/null avatar when profile fetch fails', async () => {
    const { wrapper } = createWrapper();
    mockGetProfile.mockRejectedValueOnce(new Error('no profile'));
    const { result } = renderHook(() => useCreateAccount(), { wrapper });

    result.current.mutate({
      email: 'a@b.com',
      handle: 'handle',
      password: 'pass',
      pdsUrl: 'https://pds',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSetAuth.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'handle', avatar: null }),
    );
  });

  it('surfaces an error when account creation fails', async () => {
    const { wrapper } = createWrapper();
    mockCreateAccount.mockRejectedValueOnce(new Error('taken'));
    const { result } = renderHook(() => useCreateAccount(), { wrapper });

    result.current.mutate({
      email: 'a@b.com',
      handle: 'handle',
      password: 'pass',
      pdsUrl: 'https://pds',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockSetAuth.mutateAsync).not.toHaveBeenCalled();
  });
});
