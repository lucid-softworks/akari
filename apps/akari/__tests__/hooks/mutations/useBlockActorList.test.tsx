import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useBlockActorList } from '@/hooks/mutations/useBlockActorList';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockBlockActorList = jest.fn();
const mockUnblockActorList = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    blockActorList: mockBlockActorList,
    unblockActorList: mockUnblockActorList,
  })),
}));

describe('useBlockActorList mutation hook', () => {
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
    mockBlockActorList.mockResolvedValue({ uri: 'at://listblock' });
    mockUnblockActorList.mockResolvedValue({});
  });

  it('blocks a moderation list and invalidates feeds', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockActorList(), { wrapper });

    result.current.mutate({ action: 'block', list: 'at://list' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockBlockActorList).toHaveBeenCalledWith('token', 'did:current', 'at://list');
    expect(mockUnblockActorList).not.toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['moderationLists'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['feed'] });
  });

  it('unblocks a moderation list by listblock uri', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockActorList(), { wrapper });

    result.current.mutate({ action: 'unblock', listblockUri: 'at://listblock' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUnblockActorList).toHaveBeenCalledWith('token', 'at://listblock');
    expect(mockBlockActorList).not.toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockActorList(), { wrapper });

    result.current.mutate({ action: 'block', list: 'at://list' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockBlockActorList).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockActorList(), { wrapper });

    result.current.mutate({ action: 'block', list: 'at://list' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockBlockActorList).not.toHaveBeenCalled();
  });

  it('errors when did missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBlockActorList(), { wrapper });

    result.current.mutate({ action: 'block', list: 'at://list' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockBlockActorList).not.toHaveBeenCalled();
  });
});
