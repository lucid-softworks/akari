import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import type { BlueskyFeedResponse, BlueskyPostView } from '@/bluesky-api';

const mockLikePost = jest.fn();
const mockUnlikePost = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    likePost: mockLikePost,
    unlikePost: mockUnlikePost,
  })),
}));

describe('useLikePost mutation hook', () => {
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
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
    mockLikePost.mockResolvedValue({});
    mockUnlikePost.mockResolvedValue({});
  });

  it('likes a post successfully', async () => {
    const { wrapper } = createWrapper();
    mockLikePost.mockResolvedValueOnce({ uri: 'like-uri' } as any);
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', postCid: 'cid', action: 'like' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockLikePost).toHaveBeenCalledWith('token', 'uri', 'cid', 'did');
  });

  it('throws error when postCid missing for like', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', action: 'like' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('unlikes a post successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', likeUri: 'like-uri', action: 'unlike' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockUnlikePost).toHaveBeenCalledWith('token', 'like-uri', 'did');
  });

  it('throws error when likeUri missing for unlike', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', action: 'unlike' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('throws error when token is missing', async () => {
    const { wrapper } = createWrapper();
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', postCid: 'cid', action: 'like' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockLikePost).not.toHaveBeenCalled();
  });

  it('throws error when did is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', postCid: 'cid', action: 'like' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockLikePost).not.toHaveBeenCalled();
  });

  it('throws error when pdsUrl is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri: 'uri', postCid: 'cid', action: 'like' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockLikePost).not.toHaveBeenCalled();
  });

  it('optimistically updates caches and finalizes like', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'uri';

    const basePost = {
      uri: postUri,
      cid: 'cid',
      author: {},
      record: {},
      indexedAt: '',
      labels: [],
      likeCount: 0,
      viewer: {},
    } as unknown as BlueskyPostView;
    const otherPost = {
      uri: 'other',
      cid: 'cid2',
      author: {},
      record: {},
      indexedAt: '',
      labels: [],
      likeCount: 0,
      viewer: {},
    } as unknown as BlueskyPostView;
    const feedResponse = {
      feed: [
        { post: basePost },
        { post: otherPost },
      ],
    } as unknown as BlueskyFeedResponse;

    queryClient.setQueryData(['timeline'], feedResponse);
    queryClient.setQueryData(['feed'], { pages: [feedResponse] });
    queryClient.setQueryData(['feed', 'valid'], { pages: [feedResponse] });
    queryClient.setQueryData(['feed', 'invalid'], {});
    queryClient.setQueryData(['authorFeed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorFeed', 'valid'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorFeed', 'invalid'], {});
    queryClient.setQueryData(['authorLikes'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorLikes', 'valid'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorLikes', 'invalid'], {});
    queryClient.setQueryData(['post', postUri], basePost);
    queryClient.setQueryData(['postThread', postUri], { thread: { post: basePost } });

    mockLikePost.mockResolvedValueOnce({ uri: 'real-like' } as any);

    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri, postCid: 'cid', action: 'like' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const updated = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(updated?.feed[0].post.viewer?.like).toBe('real-like');
    expect(updated?.feed[0].post.likeCount).toBe(1);
    expect(updated?.feed[1].post.viewer?.like).toBeUndefined();
  });

  it('rolls back cache on mutation error', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'uri';

    const basePost = {
      uri: postUri,
      cid: 'cid',
      author: {},
      record: {},
      indexedAt: '',
      labels: [],
      likeCount: 0,
      viewer: {},
    } as unknown as BlueskyPostView;
    const feedResponse = {
      feed: [{ post: basePost }],
    } as unknown as BlueskyFeedResponse;

    queryClient.setQueryData(['timeline'], feedResponse);
    queryClient.setQueryData(['feed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorFeed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorLikes'], { pages: [feedResponse] });
    queryClient.setQueryData(['post', postUri], basePost);
    queryClient.setQueryData(['postThread', postUri], { thread: { post: basePost } });

    mockLikePost.mockRejectedValueOnce(new Error('fail'));

    const snapshot = {
      timeline: queryClient.getQueryData(['timeline']),
      feed: queryClient.getQueryData(['feed']),
      authorFeed: queryClient.getQueryData(['authorFeed']),
      authorLikes: queryClient.getQueryData(['authorLikes']),
      post: queryClient.getQueryData(['post', postUri]),
      postThread: queryClient.getQueryData(['postThread', postUri]),
    };

    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri, postCid: 'cid', action: 'like' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData(['timeline'])).toEqual(snapshot.timeline);
    expect(queryClient.getQueryData(['feed'])).toEqual(snapshot.feed);
    expect(queryClient.getQueryData(['authorFeed'])).toEqual(snapshot.authorFeed);
    expect(queryClient.getQueryData(['authorLikes'])).toEqual(snapshot.authorLikes);
    expect(queryClient.getQueryData(['post', postUri])).toEqual(snapshot.post);
    expect(queryClient.getQueryData(['postThread', postUri])).toEqual(snapshot.postThread);
  });

  it('optimistically updates caches on unlike', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'uri';

    const basePost = {
      uri: postUri,
      cid: 'cid',
      author: {},
      record: {},
      indexedAt: '',
      labels: [],
      likeCount: 1,
      viewer: { like: 'like-uri' },
    } as unknown as BlueskyPostView;
    const feedResponse = {
      feed: [{ post: basePost }],
    } as unknown as BlueskyFeedResponse;

    queryClient.setQueryData(['timeline'], feedResponse);
    queryClient.setQueryData(['feed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorFeed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorLikes'], { pages: [feedResponse] });
    queryClient.setQueryData(['post', postUri], basePost);
    queryClient.setQueryData(['postThread', postUri], { thread: { post: basePost } });

    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri, likeUri: 'like-uri', action: 'unlike' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const updated = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(updated?.feed[0].post.viewer?.like).toBeUndefined();
    expect(updated?.feed[0].post.likeCount).toBe(0);
  });

  it('decrements like count without hitting zero', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'uri';

    const basePost = {
      uri: postUri,
      cid: 'cid',
      author: {},
      record: {},
      indexedAt: '',
      labels: [],
      likeCount: 2,
      viewer: { like: 'like-uri' },
    } as unknown as BlueskyPostView;
    const feedResponse = {
      feed: [{ post: basePost }],
    } as unknown as BlueskyFeedResponse;

    queryClient.setQueryData(['timeline'], feedResponse);
    queryClient.setQueryData(['feed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorFeed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorLikes'], { pages: [feedResponse] });
    queryClient.setQueryData(['post', postUri], basePost);
    queryClient.setQueryData(['postThread', postUri], { thread: { post: basePost } });

    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri, likeUri: 'like-uri', action: 'unlike' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const updated = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(updated?.feed[0].post.likeCount).toBe(1);
  });

  it('handles unlike when likeCount is missing', async () => {
    const { queryClient, wrapper } = createWrapper();
    const postUri = 'uri';

    const basePost = {
      uri: postUri,
      cid: 'cid',
      author: {},
      record: {},
      indexedAt: '',
      labels: [],
      viewer: { like: 'like-uri' },
    } as unknown as BlueskyPostView;
    const feedResponse = {
      feed: [{ post: basePost }],
    } as unknown as BlueskyFeedResponse;

    queryClient.setQueryData(['timeline'], feedResponse);
    queryClient.setQueryData(['feed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorFeed'], { pages: [feedResponse] });
    queryClient.setQueryData(['authorLikes'], { pages: [feedResponse] });
    queryClient.setQueryData(['post', postUri], basePost);
    queryClient.setQueryData(['postThread', postUri], { thread: { post: basePost } });

    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postUri, likeUri: 'like-uri', action: 'unlike' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const updated = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
    expect(updated?.feed[0].post.likeCount).toBe(0);
  });
});

