import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useRefreshToken } from '@/hooks/queries/useRefreshToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockRefreshSession = jest.fn();
const mockRefreshOAuthSession = jest.fn();
const mockReadJwtExpiry = jest.fn();
const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
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

jest.mock('@/utils/jwt', () => ({
  readJwtExpiry: (token: string) => mockReadJwtExpiry(token),
}));

jest.mock('@/utils/oauth/refresh', () => ({
  refreshOAuthSession: (account: unknown) => mockRefreshOAuthSession(account),
}));

jest.mock('@/utils/secureStorage', () => ({
  storage: {
    getItem: (key: string) => mockStorageGet(key),
    setItem: (key: string, value: unknown) => mockStorageSet(key, value),
    removeItem: jest.fn(),
  },
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
    // Default to "can't determine expiry" → defensive refresh, matching the
    // pre-expiry-gating behaviour the legacy tests in this file assume.
    mockReadJwtExpiry.mockReturnValue(null);
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
    const authError = Object.assign(new Error('expired'), { status: 401 });
    mockRefreshSession.mockRejectedValue(authError);

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

  it('skips Bearer refresh when the access token still has plenty of life left', async () => {
    const future = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour out
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'fresh-jwt' });
    (useRefreshToken as jest.Mock).mockReturnValue({ data: 'fresh-refresh' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:plc:bob', handle: 'bob.test' },
    });
    mockReadJwtExpiry.mockReturnValue(future);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockReadJwtExpiry).toHaveBeenCalledWith('fresh-jwt');
    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(mockSetAuth.mutate).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({
      isAuthenticated: true,
      user: { did: 'did:plc:bob', handle: 'bob.test' },
    });
  });

  it('refreshes Bearer when the access token is within the leeway window', async () => {
    const nearExpiry = Math.floor(Date.now() / 1000) + 30; // 30s out
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'old-jwt' });
    (useRefreshToken as jest.Mock).mockReturnValue({ data: 'old-refresh' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:plc:bob' },
    });
    mockReadJwtExpiry.mockReturnValue(nearExpiry);
    mockRefreshSession.mockResolvedValue({
      accessJwt: 'new-jwt',
      refreshJwt: 'new-refresh',
      did: 'did:plc:bob',
      handle: 'bob.test',
      active: true,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRefreshSession).toHaveBeenCalledWith('old-refresh');
    expect(mockSetAuth.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'new-jwt', refreshToken: 'new-refresh' }),
    );
  });

  it('skips OAuth refresh when expiresAt is far enough in the future', async () => {
    const oauthAccount = {
      pdsUrl: 'https://pds',
      did: 'did:plc:alice',
      handle: 'alice.test',
      oauth: { expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 },
    };
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useRefreshToken as jest.Mock).mockReturnValue({ data: 'refresh' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: oauthAccount });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRefreshOAuthSession).not.toHaveBeenCalled();
    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({
      isAuthenticated: true,
      user: { did: 'did:plc:alice', handle: 'alice.test' },
    });
  });

  it('refreshes OAuth and persists rotated tokens when expiresAt is within the leeway', async () => {
    const oauthAccount = {
      pdsUrl: 'https://pds',
      did: 'did:plc:alice',
      handle: 'alice.test',
      jwtToken: 'old-access',
      refreshToken: 'old-refresh',
      oauth: { expiresAt: Math.floor(Date.now() / 1000) + 30 },
    };
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'old-access' });
    (useRefreshToken as jest.Mock).mockReturnValue({ data: 'old-refresh' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: oauthAccount });
    mockStorageGet.mockReturnValue([{ ...oauthAccount }]);

    const refreshedAccount = {
      ...oauthAccount,
      jwtToken: 'new-access',
      refreshToken: 'new-refresh',
      oauth: {
        ...oauthAccount.oauth,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
    };
    mockRefreshOAuthSession.mockResolvedValue(refreshedAccount);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRefreshOAuthSession).toHaveBeenCalledWith(oauthAccount);
    // Rotated tokens land in secureStorage so cold-start sees them.
    expect(mockStorageSet).toHaveBeenCalledWith('jwtToken', 'new-access');
    expect(mockStorageSet).toHaveBeenCalledWith('refreshToken', 'new-refresh');
    expect(mockStorageSet).toHaveBeenCalledWith('currentAccount', refreshedAccount);
    expect(mockStorageSet).toHaveBeenCalledWith('accounts', [refreshedAccount]);
    expect(result.current.data).toEqual({
      isAuthenticated: true,
      user: { did: 'did:plc:alice', handle: 'alice.test' },
    });
  });

  it('clears auth when OAuth refresh rejects', async () => {
    const oauthAccount = {
      pdsUrl: 'https://pds',
      did: 'did:plc:alice',
      handle: 'alice.test',
      jwtToken: 'old',
      refreshToken: 'old',
      oauth: { expiresAt: Math.floor(Date.now() / 1000) + 30 },
    };
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'old' });
    (useRefreshToken as jest.Mock).mockReturnValue({ data: 'old' });
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: oauthAccount });
    mockRefreshOAuthSession.mockRejectedValue(new Error('refresh rejected'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuthStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockClearAuth.mutate).toHaveBeenCalled();
    expect(result.current.data).toEqual({ isAuthenticated: false });
  });
});

