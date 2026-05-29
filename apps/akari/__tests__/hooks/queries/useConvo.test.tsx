import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useConvo } from '@/hooks/queries/useConvo';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';

const mockGetConvo = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/useAppViewEnabled', () => ({
  useAppViewEnabled: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewEnabled: jest.fn(),
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getConvo: mockGetConvo,
  })),
}));

describe('useConvo query hook', () => {
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
    (useAppViewEnabled as jest.Mock).mockReturnValue(true);
    (readAppViewEnabled as jest.Mock).mockReturnValue(true);
  });

  it('fetches and transforms a one-on-one conversation', async () => {
    mockGetConvo.mockResolvedValueOnce({
      convo: {
        id: 'convo-1',
        members: [
          { did: 'did:me', handle: 'me' },
          { did: 'did:other', handle: 'alice', displayName: 'Alice', avatar: 'a.jpg', verification: 'v' },
        ],
        lastMessage: { text: 'hi', sentAt: '2023-01-01T00:00:00Z' },
        unreadCount: 2,
        status: 'accepted',
        muted: false,
      },
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useConvo('convo-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetConvo).toHaveBeenCalledWith('token', 'convo-1');
    expect(result.current.data).toEqual({
      id: 'convo-1',
      convoId: 'convo-1',
      handle: 'alice',
      displayName: 'Alice',
      avatar: 'a.jpg',
      verification: 'v',
      members: [
        { did: 'did:other', handle: 'alice', displayName: 'Alice', avatar: 'a.jpg', verification: 'v' },
      ],
      isGroup: false,
      lastMessage: 'hi',
      timestamp: new Date('2023-01-01T00:00:00Z').toLocaleDateString(),
      unreadCount: 2,
      status: 'accepted',
      muted: false,
    });
  });

  it('flags group conversations and falls back to handle/no-message defaults', async () => {
    mockGetConvo.mockResolvedValueOnce({
      convo: {
        id: 'convo-2',
        members: [
          { did: 'did:me', handle: 'me' },
          { did: 'did:a', handle: 'alice' },
          { did: 'did:b', handle: 'bob' },
        ],
        unreadCount: 0,
        status: 'request',
        muted: true,
      },
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useConvo('convo-2'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.isGroup).toBe(true);
    expect(result.current.data?.displayName).toBe('alice');
    expect(result.current.data?.lastMessage).toBe('No messages yet');
    expect(result.current.data?.timestamp).toBe('No messages');
  });

  it('errors when no other member is found', async () => {
    mockGetConvo.mockResolvedValue({
      convo: {
        id: 'convo-3',
        members: [{ did: 'did:me', handle: 'me' }],
        unreadCount: 0,
        status: 'accepted',
        muted: false,
      },
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useConvo('convo-3'), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );
    expect((result.current.error as Error).message).toBe('No other member found in conversation');
  });

  it('throws AppViewRequiredError when the AppView is disabled', async () => {
    (readAppViewEnabled as jest.Mock).mockReturnValue(false);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useConvo('convo-1'), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );
    expect((result.current.error as Error).message).toContain('conversations');
    expect(mockGetConvo).not.toHaveBeenCalled();
  });

  it('is disabled when convoId is missing', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useConvo(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetConvo).not.toHaveBeenCalled();
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useConvo('convo-1'), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetConvo).not.toHaveBeenCalled();
  });
});
