import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useMessages } from '@/hooks/queries/useMessages';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetMessages = jest.fn();

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  let lastOptions: unknown;

  return {
    ...actual,
    useInfiniteQuery: (options: unknown) => {
      lastOptions = options;
      return actual.useInfiniteQuery(options as never);
    },
    __getLastInfiniteQueryOptions: () => lastOptions,
    __resetLastInfiniteQueryOptions: () => {
      lastOptions = undefined;
    },
  };
});

const { __getLastInfiniteQueryOptions, __resetLastInfiniteQueryOptions } =
  jest.requireMock('@tanstack/react-query') as typeof import('@tanstack/react-query') & {
    __getLastInfiniteQueryOptions: () => unknown;
    __resetLastInfiniteQueryOptions: () => void;
  };

const getLastInfiniteQueryOptions = () => __getLastInfiniteQueryOptions();
const resetLastInfiniteQueryOptions = () => __resetLastInfiniteQueryOptions();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getMessages: mockGetMessages,
  })),
}));

describe('useMessages', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetLastInfiniteQueryOptions();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
  });

  it('fetches messages and transforms data', async () => {
    mockGetMessages.mockResolvedValueOnce({
      messages: [
        {
          id: '1',
          text: 'hello',
          sentAt: '2023-01-01T00:00:00Z',
          sender: { did: 'did:other' },
        },
      ],
      cursor: 'cursor',
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledWith('convo', 10, undefined);

    const timestamp = new Date('2023-01-01T00:00:00Z').toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(result.current.data?.pages[0]).toEqual({
      messages: [
        {
          id: '1',
          text: 'hello',
          timestamp,
          isFromMe: false,
          sentAt: '2023-01-01T00:00:00Z',
          embed: undefined,
        },
      ],
      cursor: 'cursor',
    });
  });

  it('includes embed data when provided', async () => {
    const embed = {
      $type: 'app.bsky.embed.external#view',
      external: {
        uri: 'https://example.com/article',
        title: 'Example article',
        description: 'An external link',
      },
    };

    mockGetMessages.mockResolvedValueOnce({
      messages: [
        {
          id: '3',
          text: 'with embed',
          sentAt: '2023-01-01T02:00:00Z',
          sender: { did: 'did:other' },
          embed,
        },
      ],
      cursor: undefined,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0].messages[0]).toEqual(
      expect.objectContaining({
        id: '3',
        embed,
      }),
    );
  });

  it('uses default limit and handles messages without text', async () => {
    mockGetMessages.mockResolvedValueOnce({
      messages: [
        {
          id: '2',
          text: undefined,
          sentAt: '2023-01-01T01:00:00Z',
          sender: { did: 'did:me' },
        },
      ],
      cursor: null,
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledWith('convo', 50, undefined);

    const timestamp = new Date('2023-01-01T01:00:00Z').toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    expect(result.current.data?.pages[0]).toEqual({
      messages: [
        {
          id: '2',
          text: '',
          timestamp,
          isFromMe: true,
          sentAt: '2023-01-01T01:00:00Z',
          embed: undefined,
        },
      ],
      cursor: null,
    });
  });

  it('returns permission error when API responds 401', async () => {
    mockGetMessages.mockRejectedValueOnce({ response: { status: 401 } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(1);
    expect(result.current.error).toEqual({
      type: 'permission',
      message: "Your app password doesn't have permission to access messages",
    });
  });

  it('returns network error on network failure and retries', async () => {
    mockGetMessages.mockRejectedValue({ code: 'NETWORK_ERROR' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(4);
    expect(result.current.error).toEqual({
      type: 'network',
      message: 'Network error. Please check your connection and try again',
    });
  });

  it('returns permission error when API responds 403', async () => {
    mockGetMessages.mockRejectedValueOnce({ response: { status: 403 } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(1);
    expect(result.current.error).toEqual({
      type: 'permission',
      message: 'Access to messages is not allowed with this app password',
    });
  });

  it('returns permission error when app password lacks chat scope', async () => {
    mockGetMessages.mockRejectedValueOnce({ message: 'Bad token scope: chat' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(1);
    expect(result.current.error).toEqual({
      type: 'permission',
      message:
        "Your app password doesn't have chat permissions. Please create a new app password with chat access in your Bluesky settings.",
    });
  });

  it('returns server error message for 5xx responses', async () => {
    mockGetMessages.mockRejectedValue({ response: { status: 503 } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(4);
    expect(result.current.error).toEqual({
      type: 'network',
      message: 'Server error. Please try again later',
    });
  });

  it('returns unknown error for unexpected status codes', async () => {
    mockGetMessages.mockRejectedValue({ response: { status: 404 } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(4);
    expect(result.current.error).toEqual({
      type: 'unknown',
      message: 'Failed to load messages',
    });
  });

  it('does not run query when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });

    const { wrapper } = createWrapper();
    renderHook(() => useMessages('convo', 10), { wrapper });

    expect(mockGetMessages).not.toHaveBeenCalled();
  });

  it('throws when refetching without a token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });

    const { wrapper } = createWrapper();
    renderHook(() => useMessages('convo', 10), { wrapper });

    const options = getLastInfiniteQueryOptions() as {
      queryFn: ({ pageParam }: { pageParam?: string }) => Promise<unknown>;
    };

    await expect(options.queryFn({ pageParam: undefined })).rejects.toThrow('No access token');
    expect(mockGetMessages).not.toHaveBeenCalled();
  });

  it('throws when refetching without a conversation id', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useMessages(undefined, 10), {
      wrapper,
    });

    const options = getLastInfiniteQueryOptions() as {
      queryFn: ({ pageParam }: { pageParam?: string }) => Promise<unknown>;
    };

    await expect(options.queryFn({ pageParam: undefined })).rejects.toThrow(
      'No conversation ID provided',
    );
    expect(mockGetMessages).not.toHaveBeenCalled();
  });

  it('throws when refetching without a PDS url', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me' },
    });

    const { wrapper } = createWrapper();
    renderHook(() => useMessages('convo', 10), { wrapper });

    const options = getLastInfiniteQueryOptions() as {
      queryFn: ({ pageParam }: { pageParam?: string }) => Promise<unknown>;
    };

    await expect(options.queryFn({ pageParam: undefined })).rejects.toThrow('No PDS URL available');
    expect(mockGetMessages).not.toHaveBeenCalled();
  });
});

