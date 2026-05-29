import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useMuteActorList } from '@/hooks/mutations/useMuteActorList';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockMuteActorList = jest.fn();
const mockUnmuteActorList = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    muteActorList: mockMuteActorList,
    unmuteActorList: mockUnmuteActorList,
  })),
}));

describe('useMuteActorList mutation hook', () => {
  let invalidateSpy: jest.SpyInstance;

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    mockMuteActorList.mockResolvedValue({});
    mockUnmuteActorList.mockResolvedValue({});
  });

  it('mutes a moderation list and invalidates feeds', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteActorList(), { wrapper });

    result.current.mutate({ list: 'at://list', action: 'mute' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockMuteActorList).toHaveBeenCalledWith('token', 'at://list');
    expect(mockUnmuteActorList).not.toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['moderationLists'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['feed'] });
  });

  it('unmutes a moderation list', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteActorList(), { wrapper });

    result.current.mutate({ list: 'at://list', action: 'unmute' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUnmuteActorList).toHaveBeenCalledWith('token', 'at://list');
    expect(mockMuteActorList).not.toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteActorList(), { wrapper });

    result.current.mutate({ list: 'at://list', action: 'mute' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockMuteActorList).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMuteActorList(), { wrapper });

    result.current.mutate({ list: 'at://list', action: 'mute' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockMuteActorList).not.toHaveBeenCalled();
  });
});
