import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePostThread } from '@/hooks/queries/usePostThread';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { BlueskyApi } from '@/bluesky-api';

const mockGetPostThread = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getPostThread: mockGetPostThread,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper };
};

describe('usePostThread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds' },
    });
  });

  it('fetches a post thread', async () => {
    const mockThread = { thread: { post: { uri: 'at://post/1' } } };
    mockGetPostThread.mockResolvedValueOnce(mockThread);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostThread('at://post/1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockThread);
    });

    const [[pdsUrl, options]] = jest.mocked(BlueskyApi).mock.calls;
    expect(pdsUrl).toBe('https://pds');
    expect(options).toEqual({});
    expect(mockGetPostThread).toHaveBeenCalledWith('token', 'at://post/1');
  });

  it('returns error when pdsUrl is missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostThread('at://post/1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('No PDS URL available');
    });

    expect(mockGetPostThread).not.toHaveBeenCalled();
  });

  it('throws error when token is missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostThread('at://post/1'), {
      wrapper,
    });

    const fetchResult = await result.current.refetch();

    expect(fetchResult.error).toBeInstanceOf(Error);
    expect((fetchResult.error as Error).message).toBe('No access token or post URI');
    expect(mockGetPostThread).not.toHaveBeenCalled();
  });

  it('does not fetch when post URI is missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePostThread(null), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeUndefined();
    });

    expect(mockGetPostThread).not.toHaveBeenCalled();

    const fetchResult = await result.current.refetch();
    expect(fetchResult.error).toBeInstanceOf(Error);
    expect((fetchResult.error as Error).message).toBe('No access token or post URI');
  });
});
