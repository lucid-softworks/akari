import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useBookmarkPost } from '@/hooks/mutations/useBookmarkPost';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useToast } from '@/contexts/ToastContext';
import type { BlueskyFeedResponse, BlueskyPostView } from '@/bluesky-api';

const mockCreateBookmark = jest.fn();
const mockDeleteBookmark = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

// @/contexts/ToastContext and @/hooks/useTranslation are globally mocked in
// jest.setup.js, so we read showToast off the shared mock rather than
// re-mocking (a local mock would clobber the setup's beforeEach wiring).
jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createBookmark: mockCreateBookmark,
    deleteBookmark: mockDeleteBookmark,
  })),
}));

const mockShowToast = () => (useToast() as unknown as { showToast: jest.Mock }).showToast;

const postUri = 'at://post';

const makePost = (bookmarked?: boolean): BlueskyPostView =>
  ({
    uri: postUri,
    cid: 'cid',
    author: {},
    record: {},
    indexedAt: '',
    labels: [],
    viewer: bookmarked === undefined ? {} : { bookmarked },
  }) as unknown as BlueskyPostView;

describe('useBookmarkPost mutation hook', () => {
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
    mockCreateBookmark.mockResolvedValue({});
    mockDeleteBookmark.mockResolvedValue({});
  });

  it('bookmarks a post and optimistically updates caches', async () => {
    const { queryClient, wrapper } = createWrapper();
    const feedResponse = { feed: [{ post: makePost() }] } as unknown as BlueskyFeedResponse;
    queryClient.setQueryData(['timeline'], feedResponse);
    queryClient.setQueryData(['feed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorFeed'], { pages: [feedResponse] });
    queryClient.setQueryData(['post', postUri], makePost());
    queryClient.setQueryData(['postThread', postUri], { thread: { post: makePost() } });

    const { result } = renderHook(() => useBookmarkPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'bookmark' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateBookmark).toHaveBeenCalledWith('token', postUri, 'cid');
    const timeline = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(timeline?.feed[0].post.viewer?.bookmarked).toBe(true);
    expect(queryClient.getQueryData<BlueskyPostView>(['post', postUri])?.viewer?.bookmarked).toBe(true);
    expect(
      queryClient.getQueryData<{ thread: { post: BlueskyPostView } }>(['postThread', postUri])
        ?.thread.post.viewer?.bookmarked,
    ).toBe(true);
  });

  it('patches inline reply.parent / reply.root and nested thread replies', async () => {
    const { queryClient, wrapper } = createWrapper();

    // Feed item where the bookmarked post is the inline parent + root of a reply.
    const otherPost = { ...makePost(), uri: 'at://other', viewer: {} } as unknown as BlueskyPostView;
    const timelineResponse = {
      feed: [
        {
          post: otherPost,
          reply: { parent: makePost(), root: makePost() },
        },
      ],
    } as unknown as BlueskyFeedResponse;
    queryClient.setQueryData(['timeline'], timelineResponse);
    queryClient.setQueryData(['feed'], { pages: [timelineResponse] });

    // Thread where the target lives as a nested reply rather than the root post.
    queryClient.setQueryData(['postThread', 'at://root'], {
      thread: {
        post: { ...makePost(), uri: 'at://root', viewer: {} },
        replies: [{ post: makePost(), replies: [{ post: makePost() }] }],
      },
    });

    const { result } = renderHook(() => useBookmarkPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'bookmark' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const timeline = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(timeline?.feed[0].reply?.parent?.viewer?.bookmarked).toBe(true);
    expect(timeline?.feed[0].reply?.root?.viewer?.bookmarked).toBe(true);

    const thread = queryClient.getQueryData<any>(['postThread', 'at://root']);
    expect(thread.thread.replies[0].post.viewer.bookmarked).toBe(true);
    expect(thread.thread.replies[0].replies[0].post.viewer.bookmarked).toBe(true);
  });

  it('unbookmarks a post', async () => {
    const { queryClient, wrapper } = createWrapper();
    const feedResponse = { feed: [{ post: makePost(true) }] } as unknown as BlueskyFeedResponse;
    queryClient.setQueryData(['timeline'], feedResponse);

    const { result } = renderHook(() => useBookmarkPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'unbookmark' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDeleteBookmark).toHaveBeenCalledWith('token', postUri);
    const timeline = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(timeline?.feed[0].post.viewer?.bookmarked).toBe(false);
  });

  it('rolls back caches and toasts on error', async () => {
    const { queryClient, wrapper } = createWrapper();
    const feedResponse = { feed: [{ post: makePost() }] } as unknown as BlueskyFeedResponse;
    queryClient.setQueryData(['timeline'], feedResponse);
    queryClient.setQueryData(['post', postUri], makePost());
    mockCreateBookmark.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useBookmarkPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'bookmark' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData<BlueskyPostView>(['post', postUri])?.viewer).toEqual({});
    expect(mockShowToast()).toHaveBeenCalledWith({
      type: 'error',
      message: 'post.bookmarkFailed',
    });
  });

  it('toasts the unbookmark failure message on error', async () => {
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(['timeline'], {
      feed: [{ post: makePost(true) }],
    } as unknown as BlueskyFeedResponse);
    mockDeleteBookmark.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useBookmarkPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'unbookmark' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockShowToast()).toHaveBeenCalledWith({
      type: 'error',
      message: 'post.unbookmarkFailed',
    });
  });

  it('invalidates bookmarks on success', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBookmarkPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'bookmark' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bookmarks'] });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBookmarkPost(), { wrapper });

    result.current.mutate({ postUri, postCid: 'cid', action: 'bookmark' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateBookmark).not.toHaveBeenCalled();
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:current' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBookmarkPost(), { wrapper });

    result.current.mutate({ postUri, postCid: 'cid', action: 'bookmark' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreateBookmark).not.toHaveBeenCalled();
  });
});
