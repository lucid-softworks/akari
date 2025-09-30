import { renderHook } from '@testing-library/react-native';

import { useConversations } from '@/hooks/queries/useConversations';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

type ConversationError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

type CapturedOptions = {
  queryKey: unknown[];
  queryFn: (context: { pageParam?: string }) => Promise<unknown>;
  initialPageParam: string | undefined;
  getNextPageParam: (lastPage: { cursor?: string }) => string | undefined;
  enabled: boolean;
  staleTime: number;
  retry: (failureCount: number, error: ConversationError) => boolean;
};

const mockUseInfiniteQuery = jest.fn();
const mockListConversations = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options: unknown) => mockUseInfiniteQuery(options),
}));

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    listConversations: mockListConversations,
  })),
}));

describe('useConversations', () => {
  const renderUseConversations = (
    limit?: number,
    readState?: 'unread',
    status?: 'request' | 'accepted',
    enabled?: boolean,
  ) => {
    let capturedOptions: CapturedOptions | undefined;

    mockUseInfiniteQuery.mockImplementation((options) => {
      capturedOptions = options as CapturedOptions;
      return {} as ReturnType<typeof useConversations>;
    });

    renderHook(() => useConversations(limit, readState, status, enabled));

    if (!capturedOptions) {
      throw new Error('useInfiniteQuery was not called');
    }

    return capturedOptions;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInfiniteQuery.mockReset();
    mockListConversations.mockReset();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:me' },
    });
  });

  it('configures the query and transforms responses', async () => {
    mockListConversations.mockResolvedValue({
      cursor: 'cursor',
      convos: [
        {
          id: '1',
          members: [
            { did: 'did:me', handle: 'me', displayName: 'Me', avatar: 'me.jpg' },
            { did: 'did:other', handle: 'alice', displayName: 'Alice', avatar: 'alice.jpg' },
          ],
          lastMessage: { text: 'hi', sentAt: '2023-01-01T00:00:00Z' },
          unreadCount: 1,
          status: 'accepted',
          muted: false,
        },
        {
          id: '2',
          members: [
            { did: 'did:me', handle: 'me', displayName: 'Me', avatar: 'me.jpg' },
            { did: 'did:two', handle: 'bob', avatar: 'bob.jpg' },
          ],
          unreadCount: 3,
          status: 'request',
          muted: true,
        },
      ],
    });

    const options = renderUseConversations(10);
    const result = await options.queryFn({ pageParam: undefined });

    expect(mockListConversations).toHaveBeenCalledWith(10, undefined, undefined, undefined);
    const timestamp = new Date('2023-01-01T00:00:00Z').toLocaleDateString();
    expect(result).toEqual({
      conversations: [
        {
          id: '1',
          convoId: '1',
          handle: 'alice',
          displayName: 'Alice',
          avatar: 'alice.jpg',
          lastMessage: 'hi',
          timestamp,
          unreadCount: 1,
          status: 'accepted',
          muted: false,
        },
        {
          id: '2',
          convoId: '2',
          handle: 'bob',
          displayName: 'bob',
          avatar: 'bob.jpg',
          lastMessage: 'No messages yet',
          timestamp: 'No messages',
          unreadCount: 3,
          status: 'request',
          muted: true,
        },
      ],
      cursor: 'cursor',
    });
    expect(options.queryKey).toEqual(['conversations', 10, undefined, undefined, 'did:me']);
    expect(options.initialPageParam).toBeUndefined();
    expect(options.enabled).toBe(true);
    expect(options.staleTime).toBe(30 * 1000);
    expect(options.getNextPageParam({ cursor: 'next' })).toBe('next');
  });

  it('uses default configuration values when parameters are omitted', async () => {
    mockListConversations.mockResolvedValue({ cursor: undefined, convos: [] });

    const options = renderUseConversations();

    await options.queryFn({ pageParam: undefined });

    expect(mockListConversations).toHaveBeenCalledWith(50, undefined, undefined, undefined);
    expect(options.queryKey).toEqual(['conversations', 50, undefined, undefined, 'did:me']);
    expect(options.enabled).toBe(true);
  });

  it('passes filters and cursor to the API', async () => {
    mockListConversations.mockResolvedValue({ cursor: 'cursor-2', convos: [] });

    const options = renderUseConversations(25, 'unread', 'request');
    await options.queryFn({ pageParam: 'cursor-1' });

    expect(mockListConversations).toHaveBeenCalledWith(25, 'cursor-1', 'unread', 'request');
    expect(options.queryKey).toEqual(['conversations', 25, 'unread', 'request', 'did:me']);
  });

  it('throws when no token is available and disables the query', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toThrow('No access token');
    expect(options.enabled).toBe(false);
    expect(mockListConversations).not.toHaveBeenCalled();
  });

  it('throws when no PDS URL is available', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me' },
    });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toThrow('No PDS URL available');
    expect(mockListConversations).not.toHaveBeenCalled();
  });

  it('disables the query when account information is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: undefined });

    const options = renderUseConversations(10);

    expect(options.enabled).toBe(false);
  });

  it('disables the query when explicitly disabled', () => {
    const options = renderUseConversations(10, undefined, undefined, false);

    expect(options.enabled).toBe(false);
  });

  it('maps 401 errors to permission messages', async () => {
    mockListConversations.mockRejectedValue({ response: { status: 401 } });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toEqual({
      type: 'permission',
      message: "Your app password doesn't have permission to access messages",
    });
  });

  it('maps 403 errors to permission messages', async () => {
    mockListConversations.mockRejectedValue({ response: { status: 403 } });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toEqual({
      type: 'permission',
      message: 'Access to messages is not allowed with this app password',
    });
  });

  it('maps bad token scope messages to permission errors', async () => {
    mockListConversations.mockRejectedValue({ message: 'Bad token scope: missing chat permission' });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toEqual({
      type: 'permission',
      message:
        "Your app password doesn't have chat permissions. Please create a new app password with chat access in your Bluesky settings.",
    });
  });

  it('maps network errors when the message mentions network issues', async () => {
    mockListConversations.mockRejectedValue({ message: 'Temporary network issue' });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toEqual({
      type: 'network',
      message: 'Network error. Please check your connection and try again',
    });
  });

  it('maps network errors when the error code indicates network failure', async () => {
    mockListConversations.mockRejectedValue({ code: 'NETWORK_ERROR' });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toEqual({
      type: 'network',
      message: 'Network error. Please check your connection and try again',
    });
  });

  it('maps server errors to network messages', async () => {
    mockListConversations.mockRejectedValue({ response: { status: 503 } });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toEqual({
      type: 'network',
      message: 'Server error. Please try again later',
    });
  });

  it('returns unknown errors when conversation members are invalid', async () => {
    mockListConversations.mockResolvedValue({
      cursor: undefined,
      convos: [
        {
          id: '1',
          members: [{ did: 'did:me', handle: 'me', displayName: 'Me', avatar: 'me.jpg' }],
          unreadCount: 0,
          status: 'accepted',
          muted: false,
        },
      ],
    });

    const options = renderUseConversations(10);

    await expect(options.queryFn({ pageParam: undefined })).rejects.toEqual({
      type: 'unknown',
      message: 'Failed to load conversations',
    });
  });

  it('provides retry logic that avoids permission errors', () => {
    mockListConversations.mockResolvedValue({ cursor: undefined, convos: [] });

    const options = renderUseConversations(10);

    expect(options.retry(1, { type: 'permission', message: '' })).toBe(false);
    expect(options.retry(1, { type: 'network', message: '' })).toBe(true);
    expect(options.retry(3, { type: 'network', message: '' })).toBe(false);
  });
});
