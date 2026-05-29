import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCreateReview } from '@/hooks/mutations/useCreateReview';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import type { CreateReviewInput } from '@/bluesky-api';

const mockCreateReview = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createReview: mockCreateReview,
  })),
}));

describe('useCreateReview mutation hook', () => {
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

  const review = { value: 4, item: 'at://item' } as unknown as CreateReviewInput;

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    mockCreateReview.mockResolvedValue({ uri: 'at://review' });
  });

  it('creates a review and invalidates author posts + timeline', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateReview(), { wrapper });

    result.current.mutate(review);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreateReview).toHaveBeenCalledWith('token', 'did:current', review);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['authorPosts'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateReview(), { wrapper });

    result.current.mutate(review);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateReview).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateReview(), { wrapper });

    result.current.mutate(review);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateReview).not.toHaveBeenCalled();
  });

  it('errors when did missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateReview(), { wrapper });

    result.current.mutate(review);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateReview).not.toHaveBeenCalled();
  });
});
