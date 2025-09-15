import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCreatePost } from '@/hooks/mutations/useCreatePost';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockCreatePostApi = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createPost: mockCreatePostApi,
  })),
}));

describe('useCreatePost mutation hook', () => {
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
      data: { did: 'did', pdsUrl: 'https://pds', handle: 'h' },
    });
    mockCreatePostApi.mockResolvedValue({ uri: 'uri' });
  });

  it('creates a post successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePost(), { wrapper });

    const postData = {
      text: 'hello',
      replyTo: { root: 'r', parent: 'p' },
      images: [{ uri: 'i', alt: 'a', mimeType: 'image/png' }],
    };

    result.current.mutate(postData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreatePostApi).toHaveBeenCalledWith('token', 'did', postData);
  });

  it('optimistically updates caches and rolls back on error', async () => {
    const { queryClient, wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
    mockCreatePostApi.mockRejectedValueOnce(new Error('fail'));

    const initial = {
      pages: [{ feed: [{ uri: 'old', cid: 'cid', record: {}, author: {} }] }],
      pageParams: [],
    };
    queryClient.setQueryData(['timeline'], initial);
    queryClient.setQueryData(['feed'], initial);
    queryClient.setQueryData(['authorFeed', 'did'], initial);
    queryClient.setQueryData(['authorPosts', 'did'], initial);

    const { result } = renderHook(() => useCreatePost(), { wrapper });

    result.current.mutate({
      text: 'err',
      replyTo: { root: 'rr', parent: 'pp' },
      images: [{ uri: 'u', alt: 'alt', mimeType: 'image/png' }],
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData(['timeline'])).toEqual(initial);
    expect(queryClient.getQueryData(['feed'])).toEqual(initial);
    expect(queryClient.getQueryData(['authorFeed', 'did'])).toEqual(initial);
    expect(queryClient.getQueryData(['authorPosts', 'did'])).toEqual(initial);
  });

  it('returns early when cached feeds are empty', async () => {
    const { queryClient, wrapper } = createWrapper();
    const empty = { pages: [{}], pageParams: [] };
    queryClient.setQueryData(['timeline'], empty);
    queryClient.setQueryData(['feed'], empty);
    queryClient.setQueryData(['authorFeed', 'did'], empty);
    queryClient.setQueryData(['authorPosts', 'did'], empty);

    const { result } = renderHook(() => useCreatePost(), { wrapper });

    result.current.mutate({ text: 'none' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryClient.getQueryData(['timeline'])).toEqual(empty);
    expect(queryClient.getQueryData(['feed'])).toEqual(empty);
    expect(queryClient.getQueryData(['authorFeed', 'did'])).toEqual(empty);
    expect(queryClient.getQueryData(['authorPosts', 'did'])).toEqual(empty);
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePost(), { wrapper });

    result.current.mutate({ text: 'hello' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('errors when DID missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', handle: 'h' },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePost(), { wrapper });

    result.current.mutate({ text: 'hello' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did', handle: 'h' },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePost(), { wrapper });

    result.current.mutate({ text: 'hello' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('invalidates queries on success', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreatePost(), { wrapper });

    result.current.mutate({ text: 'hello' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenNthCalledWith(1, { queryKey: ['timeline'] });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, { queryKey: ['feed'] });
    expect(invalidateSpy).toHaveBeenNthCalledWith(3, {
      queryKey: ['authorFeed', 'did'],
    });
    expect(invalidateSpy).toHaveBeenNthCalledWith(4, {
      queryKey: ['authorPosts', 'did'],
    });
  });
});

