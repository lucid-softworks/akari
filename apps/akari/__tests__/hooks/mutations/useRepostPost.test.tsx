import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useRepostPost } from '@/hooks/mutations/useRepostPost';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';
import type { BlueskyFeedResponse, BlueskyPostView } from '@/bluesky-api';

const mockRepostPost = jest.fn();
const mockUnrepostPost = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));

describe('useRepostPost mutation hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  const basePost = (uri: string): BlueskyPostView =>
    ({
      uri,
      cid: 'cid',
      author: {},
      record: {},
      indexedAt: '',
      labels: [],
      repostCount: 0,
      viewer: {},
    }) as unknown as BlueskyPostView;

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
    (apiForAccount as jest.Mock).mockReturnValue({
      repostPost: mockRepostPost,
      unrepostPost: mockUnrepostPost,
    });
    mockRepostPost.mockResolvedValue({ uri: 'repost-uri' });
    mockUnrepostPost.mockResolvedValue({});
  });

  it('reposts a post and optimistically updates timeline then finalizes uri', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'at://post';
    const feed = { feed: [{ post: basePost(postUri) }] } as unknown as BlueskyFeedResponse;
    queryClient.setQueryData(['timeline'], feed);

    const { result } = renderHook(() => useRepostPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'repost' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRepostPost).toHaveBeenCalledWith('token', postUri, 'cid', 'did:me');

    const updated = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(updated?.feed[0].post.repostCount).toBe(1);
    expect(updated?.feed[0].post.viewer?.repost).toBe('repost-uri');
  });

  it('optimistically patches feed pages, author feed, post, thread and reply views', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'at://post';

    const timeline = {
      feed: [
        { post: basePost(postUri) },
        {
          post: basePost('at://child'),
          reply: { parent: basePost(postUri), root: basePost(postUri) },
        },
      ],
    } as unknown as BlueskyFeedResponse;
    const page = { feed: [{ post: basePost(postUri) }] } as unknown as BlueskyFeedResponse;

    queryClient.setQueryData(['timeline'], timeline);
    queryClient.setQueryData(['feed', 'a'], { pages: [page] });
    queryClient.setQueryData(['feed', 'bad'], { notPages: true });
    queryClient.setQueryData(['authorFeed', 'a'], { pages: [page] });
    queryClient.setQueryData(['post', postUri], basePost(postUri));
    queryClient.setQueryData(['postThread', postUri], { thread: { post: basePost(postUri) } });

    const { result } = renderHook(() => useRepostPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'repost' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const tl = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(tl?.feed[0].post.viewer?.repost).toBe('repost-uri');
    expect(tl?.feed[1].reply?.parent?.viewer?.repost).toBe('repost-uri');
    expect(tl?.feed[1].reply?.root?.viewer?.repost).toBe('repost-uri');

    const feedData = queryClient.getQueryData<{ pages: BlueskyFeedResponse[] }>(['feed', 'a']);
    expect(feedData?.pages[0].feed[0].post.viewer?.repost).toBe('repost-uri');

    const authorData = queryClient.getQueryData<{ pages: BlueskyFeedResponse[] }>(['authorFeed', 'a']);
    expect(authorData?.pages[0].feed[0].post.repostCount).toBe(1);

    const postData = queryClient.getQueryData<BlueskyPostView>(['post', postUri]);
    expect(postData?.viewer?.repost).toBe('repost-uri');

    const threadData = queryClient.getQueryData<{ thread: { post: BlueskyPostView } }>([
      'postThread',
      postUri,
    ]);
    expect(threadData?.thread.post.viewer?.repost).toBe('repost-uri');
  });

  it('optimistically decrements repost count on unrepost', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'at://post';
    const reposted = {
      ...basePost(postUri),
      repostCount: 2,
      viewer: { repost: 'old' },
    } as unknown as BlueskyPostView;
    queryClient.setQueryData(['timeline'], {
      feed: [{ post: reposted }],
    } as unknown as BlueskyFeedResponse);

    const { result } = renderHook(() => useRepostPost(), { wrapper });
    result.current.mutate({ postUri, repostUri: 'old', action: 'unrepost' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const tl = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(tl?.feed[0].post.repostCount).toBe(1);
    expect(tl?.feed[0].post.viewer?.repost).toBeUndefined();
  });

  it('unreposts a post', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRepostPost(), { wrapper });

    result.current.mutate({ postUri: 'at://post', repostUri: 'repost-uri', action: 'unrepost' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUnrepostPost).toHaveBeenCalledWith('token', 'repost-uri', 'did:me');
  });

  it('errors when postCid missing for repost', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRepostPost(), { wrapper });

    result.current.mutate({ postUri: 'at://post', action: 'repost' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockRepostPost).not.toHaveBeenCalled();
  });

  it('errors when repostUri missing for unrepost', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRepostPost(), { wrapper });

    result.current.mutate({ postUri: 'at://post', action: 'unrepost' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockUnrepostPost).not.toHaveBeenCalled();
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRepostPost(), { wrapper });

    result.current.mutate({ postUri: 'at://post', postCid: 'cid', action: 'repost' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockRepostPost).not.toHaveBeenCalled();
  });

  it('rolls back timeline on error', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'at://post';
    const feed = { feed: [{ post: basePost(postUri) }] } as unknown as BlueskyFeedResponse;
    queryClient.setQueryData(['timeline'], feed);
    const snapshot = queryClient.getQueryData(['timeline']);
    mockRepostPost.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useRepostPost(), { wrapper });
    result.current.mutate({ postUri, postCid: 'cid', action: 'repost' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(['timeline'])).toEqual(snapshot);
  });
});
