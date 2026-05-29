import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSession } from '@/hooks/queries/useSession';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';

const mockGetSession = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

describe('useSession query hook', () => {
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
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
    (apiForAccount as jest.Mock).mockReturnValue({ getSession: mockGetSession });
  });

  it('fetches the session for the current account', async () => {
    const session = { handle: 'me.bsky.social', did: 'did:me', email: 'me@example.com' };
    mockGetSession.mockResolvedValue(session);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(apiForAccount).toHaveBeenCalledWith({ did: 'did:me', pdsUrl: 'https://pds' });
    expect(mockGetSession).toHaveBeenCalledWith('token');
    expect(result.current.data).toEqual(session);
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('is disabled when pdsUrl is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});
