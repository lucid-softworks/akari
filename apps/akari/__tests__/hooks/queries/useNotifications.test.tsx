import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useNotifications } from '@/hooks/queries/useNotifications';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockListNotifications = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    listNotifications: mockListNotifications,
  })),
}));

describe('useNotifications', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper, queryClient };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });
  });

  it('fetches notifications and handles pagination', async () => {
    mockListNotifications
      .mockResolvedValueOnce({
        cursor: 'cursor1',
        priority: false,
        seenAt: '2023-01-01T00:00:00Z',
        notifications: [
          {
            uri: 'notif1',
            author: {
              did: 'did:alice',
              handle: 'alice',
              displayName: 'Alice',
              avatar: 'alice.jpg',
            },
            reason: 'mention',
            reasonSubject: 'post1',
            isRead: false,
            indexedAt: '2023-01-01T00:00:00Z',
            record: {
              text: 'hi',
              embed: { $type: 'app.bsky.embed.images', images: [] },
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        cursor: undefined,
        priority: false,
        seenAt: '2023-01-01T00:00:00Z',
        notifications: [
          {
            uri: 'notif2',
            author: {
              did: 'did:bob',
              handle: 'bob',
              displayName: 'Bob',
              avatar: 'bob.jpg',
            },
            reason: 'mention',
            isRead: false,
            indexedAt: '2023-01-01T00:00:00Z',
            record: undefined,
          },
          {
            uri: 'notif3',
            author: {
              did: 'did:carol',
              handle: 'carol',
              displayName: 'Carol',
              avatar: 'carol.jpg',
            },
            reason: 'like',
            isRead: true,
            indexedAt: '2023-01-02T00:00:00Z',
            record: {},
          },
        ],
      });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(10), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.pages[0].notifications[0]).toEqual({
        id: 'notif1',
        author: {
          did: 'did:alice',
          handle: 'alice',
          displayName: 'Alice',
          avatar: 'alice.jpg',
        },
        reason: 'mention',
        reasonSubject: 'post1',
        isRead: false,
        indexedAt: '2023-01-01T00:00:00Z',
        record: {
          text: 'hi',
          embed: { $type: 'app.bsky.embed.images', images: [] },
        },
        postContent: 'hi',
        embed: { $type: 'app.bsky.embed.images', images: [] },
      });
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockListNotifications).toHaveBeenLastCalledWith(10, 'cursor1', undefined, undefined);

    await waitFor(() => {
      expect(result.current.data?.pages[1].notifications[0].id).toBe('notif2');
    });
  });

  it('returns permission error when API responds 401', async () => {
    mockListNotifications.mockRejectedValue({ response: { status: 401 } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual({
      type: 'permission',
      message: 'Authentication failed. Please sign in again.',
    });
  });

  it.each([
    [
      '403 permission error',
      { response: { status: 403 } },
      {
        type: 'permission',
        message: 'Access to notifications is not allowed',
      },
    ],
    [
      'network error by message',
      new Error('network request failed'),
      {
        type: 'network',
        message: 'Network error. Please check your connection and try again',
      },
    ],
    [
      'network error by code',
      { code: 'NETWORK_ERROR' },
      {
        type: 'network',
        message: 'Network error. Please check your connection and try again',
      },
    ],
    [
      'server error',
      { response: { status: 503 } },
      {
        type: 'network',
        message: 'Server error. Please try again later',
      },
    ],
    [
      'unknown error type',
      { message: 'unhandled failure' },
      {
        type: 'unknown',
        message: 'Failed to load notifications',
      },
    ],
  ])('handles %s responses', async (_title, error, expectedError) => {
    mockListNotifications.mockRejectedValue(error);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(expectedError);
  });

  it('throws error when fetching without access token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });

    const { wrapper, queryClient } = createWrapper();
    const { unmount } = renderHook(() => useNotifications(), { wrapper });

    const query = queryClient.getQueryCache().find({
      queryKey: ['notifications', 50, undefined, undefined, 'did:me'],
    });
    expect(query).toBeDefined();
    await expect(query!.options.queryFn?.({ pageParam: undefined })).rejects.toThrow(
      'No access token',
    );

    unmount();
    queryClient.clear();
  });

  it('throws error when PDS URL is unavailable', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me' },
    });

    const { wrapper, queryClient } = createWrapper();
    const { unmount } = renderHook(() => useNotifications(50, undefined, undefined, false), {
      wrapper,
    });

    const query = queryClient.getQueryCache().find({
      queryKey: ['notifications', 50, undefined, undefined, 'did:me'],
    });
    expect(query).toBeDefined();
    await expect(query!.options.queryFn?.({ pageParam: undefined })).rejects.toThrow(
      'No PDS URL available',
    );
    expect(mockListNotifications).not.toHaveBeenCalled();

    unmount();
    queryClient.clear();
  });

  it('does not run query without token', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });

    const { wrapper } = createWrapper();
    renderHook(() => useNotifications(), { wrapper });

    expect(mockListNotifications).not.toHaveBeenCalled();
  });

  it('does not run when disabled', () => {
    const { wrapper } = createWrapper();
    renderHook(() => useNotifications(50, undefined, undefined, false), { wrapper });

    expect(mockListNotifications).not.toHaveBeenCalled();
  });
});

