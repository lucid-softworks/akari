import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetFeedGenerators = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getFeedGenerators: mockGetFeedGenerators,
  })),
}));

describe('useFeedGenerators query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
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
      data: { pdsUrl: 'https://pds' },
    });
  });

  it('fetches feed generators for provided URIs', async () => {
    mockGetFeedGenerators.mockResolvedValue({ feeds: [{ uri: 'feed1' }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeedGenerators(['feed1']), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetFeedGenerators).toHaveBeenCalledWith(['feed1']);
    expect(result.current.data).toEqual({ feeds: [{ uri: 'feed1' }] });
  });

  it('returns empty list when no feed URIs provided', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeedGenerators([]), { wrapper });

    const fetchResult = await result.current.refetch();

    expect(mockGetFeedGenerators).not.toHaveBeenCalled();
    expect(fetchResult.data).toEqual({ feeds: [] });
  });

  it('throws error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeedGenerators(['feed1']), {
      wrapper,
    });

    await expect(result.current.refetch({ throwOnError: true })).rejects.toThrow(
      'No access token',
    );
    expect(mockGetFeedGenerators).not.toHaveBeenCalled();
  });

  it('throws error when PDS URL is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFeedGenerators(['feed1']), {
      wrapper,
    });

    await expect(result.current.refetch({ throwOnError: true })).rejects.toThrow(
      'No PDS URL available',
    );
    expect(mockGetFeedGenerators).not.toHaveBeenCalled();
  });
});

