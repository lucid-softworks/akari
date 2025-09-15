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

    expect(mockListNotifications).toHaveBeenLastCalledWith(
      'token',
      10,
      'cursor1',
      undefined,
      undefined,
    );

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

