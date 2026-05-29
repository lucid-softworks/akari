import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useMuteUser } from '@/hooks/mutations/useMuteUser';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';

const mockMuteUser = jest.fn();
const mockUnmuteUser = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

describe('useMuteUser mutation hook', () => {
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
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
    (apiForAccount as jest.Mock).mockReturnValue({
      muteUser: mockMuteUser,
      unmuteUser: mockUnmuteUser,
    });
    mockMuteUser.mockResolvedValue({});
    mockUnmuteUser.mockResolvedValue({});
  });

  it('mutes a user and invalidates caches', async () => {
    const { queryClient, wrapper } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMuteUser(), { wrapper });

    result.current.mutate({ actor: 'did:actor', action: 'mute' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMuteUser).toHaveBeenCalledWith('token', 'did:actor');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['mutes'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
  });

  it('unmutes a user', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteUser(), { wrapper });

    result.current.mutate({ actor: 'did:actor', action: 'unmute' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUnmuteUser).toHaveBeenCalledWith('token', 'did:actor');
    expect(mockMuteUser).not.toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteUser(), { wrapper });

    result.current.mutate({ actor: 'did:actor', action: 'mute' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockMuteUser).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteUser(), { wrapper });

    result.current.mutate({ actor: 'did:actor', action: 'mute' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockMuteUser).not.toHaveBeenCalled();
  });
});
