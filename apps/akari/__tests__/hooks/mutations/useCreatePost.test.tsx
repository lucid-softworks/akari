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

    result.current.mutate({ text: 'hello' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreatePostApi).toHaveBeenCalledWith('token', 'did', {
      text: 'hello',
      replyTo: undefined,
      images: undefined,
    });
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

