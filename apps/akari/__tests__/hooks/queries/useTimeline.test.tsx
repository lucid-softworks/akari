import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useTimeline } from '@/hooks/queries/useTimeline';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetTimeline = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getTimeline: mockGetTimeline,
  })),
}));

describe('useTimeline query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
  });

  it('fetches timeline posts with specified limit', async () => {
    mockGetTimeline.mockResolvedValueOnce({ feed: [{ post: { uri: '1' } }] });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTimeline(10), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ feed: [{ post: { uri: '1' } }] });
    });

    expect(mockGetTimeline).toHaveBeenCalledWith('token', 10);
  });

  it('uses default limit when none provided', async () => {
    mockGetTimeline.mockResolvedValueOnce({ feed: [] });
    const { wrapper } = createWrapper();
    renderHook(() => useTimeline(), { wrapper });

    await waitFor(() => {
      expect(mockGetTimeline).toHaveBeenCalledWith('token', 20);
    });
  });

  it('returns error when pdsUrl is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTimeline(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect((result.current.error as Error).message).toBe('No PDS URL available');
    });

    expect(mockGetTimeline).not.toHaveBeenCalled();
  });

  it('throws error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTimeline(), { wrapper });

    const fetchResult = await result.current.refetch();
    expect((fetchResult.error as Error).message).toBe('No access token');
  });

  it('does not fetch when disabled', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTimeline(20, false), { wrapper });

    expect(result.current.data).toBeUndefined();
    await waitFor(() => {
      expect(mockGetTimeline).not.toHaveBeenCalled();
    });
  });
});

