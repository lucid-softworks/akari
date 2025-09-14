import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockLikePost = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    likePost: mockLikePost,
    unlikePost: jest.fn(),
  })),
}));

describe('useLikePost mutation hook', () => {
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
    mockLikePost.mockResolvedValue({});
  });

  it('likes a post successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', postCid: 'cid', action: 'like' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockLikePost).toHaveBeenCalledWith('token', 'uri', 'cid', 'did');
  });

  it('throws error when postCid missing for like', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', action: 'like' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

