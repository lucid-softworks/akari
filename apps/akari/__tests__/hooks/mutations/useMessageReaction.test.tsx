import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useMessageReaction } from '@/hooks/mutations/useMessageReaction';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockAddReaction = jest.fn();
const mockRemoveReaction = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    addReaction: mockAddReaction,
    removeReaction: mockRemoveReaction,
  })),
}));

const convoId = 'c1';
const messagesKey = ['messages', convoId, 50, 'did:current'];

const buildPage = (reactions: { value: string; sender: { did: string }; createdAt: string }[]) => ({
  pages: [
    {
      messages: [{ id: 'm1', reactions }],
      cursor: undefined,
    },
  ],
  pageParams: [undefined],
});

describe('useMessageReaction mutation hook', () => {
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
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    mockAddReaction.mockResolvedValue({});
    mockRemoveReaction.mockResolvedValue({});
  });

  it('adds a reaction and optimistically patches the cache', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(messagesKey, buildPage([]));

    const { result } = renderHook(() => useMessageReaction(), { wrapper });
    result.current.mutate({ convoId, messageId: 'm1', value: '👍', action: 'add' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockAddReaction).toHaveBeenCalledWith('token', convoId, 'm1', '👍');
    const data = queryClient.getQueryData<any>(messagesKey);
    expect(data.pages[0].messages[0].reactions).toHaveLength(1);
    expect(data.pages[0].messages[0].reactions[0]).toMatchObject({
      value: '👍',
      sender: { did: 'did:current' },
    });
  });

  it('does not double-add an existing reaction', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(
      messagesKey,
      buildPage([{ value: '👍', sender: { did: 'did:current' }, createdAt: 'now' }]),
    );

    const { result } = renderHook(() => useMessageReaction(), { wrapper });
    result.current.mutate({ convoId, messageId: 'm1', value: '👍', action: 'add' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = queryClient.getQueryData<any>(messagesKey);
    expect(data.pages[0].messages[0].reactions).toHaveLength(1);
  });

  it('removes a reaction and optimistically patches the cache', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(
      messagesKey,
      buildPage([{ value: '👍', sender: { did: 'did:current' }, createdAt: 'now' }]),
    );

    const { result } = renderHook(() => useMessageReaction(), { wrapper });
    result.current.mutate({ convoId, messageId: 'm1', value: '👍', action: 'remove' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockRemoveReaction).toHaveBeenCalledWith('token', convoId, 'm1', '👍');
    const data = queryClient.getQueryData<any>(messagesKey);
    expect(data.pages[0].messages[0].reactions).toHaveLength(0);
  });

  it('invalidates the message cache on error', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(messagesKey, buildPage([]));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    mockAddReaction.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useMessageReaction(), { wrapper });
    result.current.mutate({ convoId, messageId: 'm1', value: '👍', action: 'add' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessageReaction(), { wrapper });

    result.current.mutate({ convoId, messageId: 'm1', value: '👍', action: 'add' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockAddReaction).not.toHaveBeenCalled();
  });

  it('skips optimistic patch when there is no current did', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessageReaction(), { wrapper });

    // No did means mutationFn passes the pdsUrl guard but onMutate returns early;
    // addReaction still fires since token + pdsUrl are present.
    result.current.mutate({ convoId, messageId: 'm1', value: '👍', action: 'add' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockAddReaction).toHaveBeenCalled();
  });
});
