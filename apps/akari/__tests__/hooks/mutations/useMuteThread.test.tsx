import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useMuteThread } from '@/hooks/mutations/useMuteThread';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';

const mockMuteThread = jest.fn();
const mockUnmuteThread = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

describe('useMuteThread mutation hook', () => {
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
      muteThread: mockMuteThread,
      unmuteThread: mockUnmuteThread,
    });
    mockMuteThread.mockResolvedValue({});
    mockUnmuteThread.mockResolvedValue({});
  });

  it('mutes a thread and invalidates caches', async () => {
    const { queryClient, wrapper } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMuteThread(), { wrapper });

    result.current.mutate({ root: 'at://root', action: 'mute' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMuteThread).toHaveBeenCalledWith('token', 'at://root');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['postThread'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('unmutes a thread', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteThread(), { wrapper });

    result.current.mutate({ root: 'at://root', action: 'unmute' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUnmuteThread).toHaveBeenCalledWith('token', 'at://root');
    expect(mockMuteThread).not.toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteThread(), { wrapper });

    result.current.mutate({ root: 'at://root', action: 'mute' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockMuteThread).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteThread(), { wrapper });

    result.current.mutate({ root: 'at://root', action: 'mute' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockMuteThread).not.toHaveBeenCalled();
  });
});
