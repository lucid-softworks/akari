import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCreateList } from '@/hooks/mutations/useCreateList';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockCreateList = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createList: mockCreateList,
  })),
}));

describe('useCreateList mutation hook', () => {
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
    mockCreateList.mockResolvedValue({ uri: 'at://list' });
  });

  it('creates a curate list by default and invalidates lists', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateList(), { wrapper });

    result.current.mutate({ name: 'My List', description: 'desc' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateList).toHaveBeenCalledWith('token', 'did:current', {
      name: 'My List',
      description: 'desc',
      purpose: 'app.bsky.graph.defs#curatelist',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['lists', 'https://pds', 'did:current', undefined],
    });
  });

  it('honours an explicit purpose (modlist)', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateList(), { wrapper });

    result.current.mutate({ name: 'Block List', purpose: 'app.bsky.graph.defs#modlist' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateList).toHaveBeenCalledWith('token', 'did:current', {
      name: 'Block List',
      description: undefined,
      purpose: 'app.bsky.graph.defs#modlist',
    });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateList(), { wrapper });

    result.current.mutate({ name: 'My List' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateList).not.toHaveBeenCalled();
  });

  it('errors when did missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateList(), { wrapper });

    result.current.mutate({ name: 'My List' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateList).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateList(), { wrapper });

    result.current.mutate({ name: 'My List' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateList).not.toHaveBeenCalled();
  });
});
