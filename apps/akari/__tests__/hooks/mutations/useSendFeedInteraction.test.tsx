import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSendFeedInteraction } from '@/hooks/mutations/useSendFeedInteraction';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';

const mockSendInteractions = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

const FEED_GEN_URI = 'at://did:plc:gen/app.bsky.feed.generator/abc';

describe('useSendFeedInteraction mutation hook', () => {
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
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
    (apiForAccount as jest.Mock).mockReturnValue({ sendInteractions: mockSendInteractions });
    mockSendInteractions.mockResolvedValue({});
  });

  it('extracts the feed gen DID and proxies the interaction', async () => {
    const { queryClient, wrapper } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSendFeedInteraction(), { wrapper });

    result.current.mutate({
      feedUri: FEED_GEN_URI,
      postUri: 'at://post',
      event: 'app.bsky.feed.defs#interactionRequestMore',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSendInteractions).toHaveBeenCalledWith('token', 'did:plc:gen', [
      { event: 'app.bsky.feed.defs#interactionRequestMore', item: 'at://post' },
    ]);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['feed', FEED_GEN_URI, 'https://pds'] });
  });

  it('includes feedContext when provided', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSendFeedInteraction(), { wrapper });

    result.current.mutate({
      feedUri: FEED_GEN_URI,
      postUri: 'at://post',
      event: 'app.bsky.feed.defs#interactionSeen',
      feedContext: 'ctx',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSendInteractions).toHaveBeenCalledWith('token', 'did:plc:gen', [
      { event: 'app.bsky.feed.defs#interactionSeen', item: 'at://post', feedContext: 'ctx' },
    ]);
  });

  it('is a no-op for non feed-generator URIs', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSendFeedInteraction(), { wrapper });

    result.current.mutate({
      feedUri: 'following',
      postUri: 'at://post',
      event: 'app.bsky.feed.defs#interactionSeen',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSendInteractions).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSendFeedInteraction(), { wrapper });

    result.current.mutate({
      feedUri: FEED_GEN_URI,
      postUri: 'at://post',
      event: 'app.bsky.feed.defs#interactionSeen',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSendInteractions).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSendFeedInteraction(), { wrapper });

    result.current.mutate({
      feedUri: FEED_GEN_URI,
      postUri: 'at://post',
      event: 'app.bsky.feed.defs#interactionSeen',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSendInteractions).not.toHaveBeenCalled();
  });
});
