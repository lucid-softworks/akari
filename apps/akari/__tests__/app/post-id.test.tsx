import React from 'react';
import { render, act } from '@testing-library/react-native';

import PostDetailScreen, { renderComment } from '@/app/post/[id]';
import { useLocalSearchParams } from 'expo-router';
import { usePost, useParentPost, useRootPost } from '@/hooks/queries/usePost';
import { usePostThread } from '@/hooks/queries/usePostThread';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useLocalSearchParams: jest.fn(),
    Stack: { Screen: jest.fn(() => null) },
  };
});

jest.mock('@/components/PostCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { PostCard: ({ post }: { post: any }) => <Text>{post.id}</Text> };
});

jest.mock('@/components/skeletons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { PostDetailSkeleton: () => <Text>Skeleton</Text> };
});

jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: (props: any) => <View {...props} /> };
});

jest.mock('@/hooks/useThemeColor', () => ({ useThemeColor: jest.fn(() => '#000') }));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      switch (key) {
        case 'navigation.post':
          return 'Post';
        case 'post.postNotFound':
          return 'Post not found';
        case 'post.comments':
          return `Comments (${params?.count})`;
        case 'post.noCommentsYet':
          return 'No comments yet';
        default:
          return key;
      }
    },
  }),
}));

jest.mock('@/hooks/queries/usePost');
const mockUsePost = usePost as unknown as jest.Mock;
const mockUseParentPost = useParentPost as unknown as jest.Mock;
const mockUseRootPost = useRootPost as unknown as jest.Mock;

jest.mock('@/hooks/queries/usePostThread');
const mockUsePostThread = usePostThread as unknown as jest.Mock;

const mockUseLocalSearchParams = useLocalSearchParams as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ id: 'id1' });
});

describe('PostDetailScreen', () => {
  it('renders skeleton while loading', () => {
    mockUsePost.mockReturnValue({ data: null, isLoading: true, error: null });
    mockUsePostThread.mockReturnValue({ data: null, isLoading: false });
    mockUseParentPost.mockReturnValue({ parentPost: null, isLoading: false });
    mockUseRootPost.mockReturnValue({ rootPost: null, isLoading: false });

    const { getByText } = render(<PostDetailScreen />);
    expect(getByText('Skeleton')).toBeTruthy();
  });

  it('renders error state', () => {
    mockUsePost.mockReturnValue({ data: null, isLoading: false, error: new Error('err') });
    mockUsePostThread.mockReturnValue({ data: null, isLoading: false });
    mockUseParentPost.mockReturnValue({ parentPost: null, isLoading: false });
    mockUseRootPost.mockReturnValue({ rootPost: null, isLoading: false });

    const { getByText } = render(<PostDetailScreen />);
    expect(getByText('Post not found')).toBeTruthy();
  });

  it('renders main post without comments', () => {
    const mainPost = {
      uri: 'post:1',
      cid: 'cid1',
      author: { handle: 'author1', displayName: 'Author One', avatar: 'a1' },
      record: { text: 'Hello world' },
      indexedAt: '2024-01-01T00:00:00.000Z',
      likeCount: 1,
      replyCount: 0,
      repostCount: 0,
      embed: null,
      embeds: null,
      labels: null,
      viewer: null,
    };

    mockUsePost.mockReturnValue({ data: mainPost, isLoading: false, error: null });
    mockUsePostThread.mockReturnValue({ data: { thread: { replies: [] } }, isLoading: false });
    mockUseParentPost.mockReturnValue({ parentPost: null, isLoading: false });
    mockUseRootPost.mockReturnValue({ rootPost: null, isLoading: false });

    const { getByText } = render(<PostDetailScreen />);
    expect(getByText('post:1')).toBeTruthy();
    expect(getByText('Comments (0)')).toBeTruthy();
    expect(getByText('No comments yet')).toBeTruthy();
  });

  it('renders full thread and scrolls to main post', async () => {
    jest.useFakeTimers();

    const scrollTo = jest.fn();
    const measureLayout = jest.fn((_: any, success: any, failure: any) => {
      success(0, 10);
      failure();
    });
    const scrollRef = { current: null as any };
    const viewRef = { current: null as any };
    const useRefSpy = jest.spyOn(React, 'useRef');
    useRefSpy.mockReturnValueOnce(scrollRef);
    useRefSpy.mockReturnValueOnce(viewRef);

    const mainPost = {
      uri: 'post:reply',
      cid: 'cidR',
      author: { handle: 'reply', displayName: 'Reply Author', avatar: 'ra' },
      record: {
        text: 'Main reply',
        reply: {
          parent: { uri: 'parent:1', author: { handle: 'parent', displayName: 'Parent' }, record: { text: 'Parent text' } },
          root: { uri: 'root:1', author: { handle: 'root', displayName: 'Root' }, record: { text: 'Root text' } },
        },
      },
      indexedAt: '2024-01-02T00:00:00.000Z',
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      embed: null,
      embeds: null,
      labels: null,
      viewer: null,
    };

    const parentPost = {
      uri: 'parent:1',
      cid: 'cidP',
      author: { handle: 'parent', displayName: 'Parent', avatar: 'pa' },
      record: { text: 'Parent text' },
      indexedAt: '2024-01-01T00:00:00.000Z',
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      embed: null,
      embeds: null,
      labels: null,
      viewer: null,
    };

    const rootPost = {
      uri: 'root:1',
      cid: 'cidRoot',
      author: { handle: 'root', displayName: 'Root', avatar: 'ra' },
      record: { text: 'Root text' },
      indexedAt: '2024-01-01T00:00:00.000Z',
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      embed: null,
      embeds: null,
      labels: null,
      viewer: null,
    };

    const feedItem = {
      post: {
        uri: 'comment:1',
        cid: 'cidC1',
        author: { handle: 'c1', displayName: 'C1', avatar: 'c1a' },
        record: { text: 'Comment 1', reply: { parent: { author: { handle: 'pc1', displayName: 'PC1' }, record: { text: 'Parent c1' } } } },
        indexedAt: '2024-01-02T01:00:00.000Z',
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        embed: null,
        embeds: null,
        labels: null,
        viewer: null,
      },
    };

    const directComment = {
      uri: 'comment:2',
      cid: 'cidC2',
      author: { handle: 'c2', displayName: 'C2', avatar: 'c2a' },
      record: { text: 'Comment 2' },
      indexedAt: '2024-01-02T02:00:00.000Z',
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      embed: null,
      embeds: null,
      labels: null,
      viewer: null,
    };

    mockUsePost.mockReturnValue({ data: mainPost, isLoading: false, error: null });
    mockUseParentPost.mockReturnValue({ parentPost, isLoading: false });
    mockUseRootPost.mockReturnValue({ rootPost, isLoading: false });
    mockUsePostThread.mockReturnValue({ data: { thread: { replies: [feedItem, directComment] } }, isLoading: false });

    const { getByText } = render(<PostDetailScreen />);
    scrollRef.current = { scrollTo };
    viewRef.current = { measureLayout };
    await act(async () => {
      jest.runAllTimers();
    });

    for (const id of ['root:1', 'parent:1', 'post:reply', 'comment:1', 'comment:2']) {
      expect(getByText(id)).toBeTruthy();
    }

    expect(scrollTo).toHaveBeenCalledWith({ y: 10, animated: false });
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });

    useRefSpy.mockRestore();
    jest.useRealTimers();
  });

  it('handles parent post without author', () => {
    const mainPost = {
      uri: 'post:reply2',
      cid: 'cidR2',
      author: { handle: 'reply2', displayName: 'Reply Two', avatar: 'ra2' },
      record: {
        text: 'Main reply two',
        reply: {
          parent: { uri: 'parent:no-author' },
          root: { uri: 'root:na', author: { handle: 'root', displayName: 'Root' }, record: { text: 'Root text' } },
        },
      },
      indexedAt: '2024-01-03T00:00:00.000Z',
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      embed: null,
      embeds: null,
      labels: null,
      viewer: null,
    };

    mockUsePost.mockReturnValue({ data: mainPost, isLoading: false, error: null });
    mockUsePostThread.mockReturnValue({ data: { thread: { replies: [] } }, isLoading: false });
    mockUseParentPost.mockReturnValue({ parentPost: { uri: 'parent:no-author' }, isLoading: false });
    mockUseRootPost.mockReturnValue({ rootPost: null, isLoading: false });

    const { queryByText } = render(<PostDetailScreen />);
    expect(queryByText('parent:no-author')).toBeNull();
  });
});

describe('renderComment', () => {
  it('handles various branches', () => {
    expect(renderComment(null as any)).toBeNull();
    expect(renderComment({ uri: 'x', blocked: true } as any)).toBeNull();
    expect(renderComment({ post: { author: { handle: undefined } } } as any)).toBeNull();
    expect(renderComment({ uri: 'y', author: { handle: undefined } } as any)).toBeNull();

    const feedItemNoReply = {
      post: {
        uri: 'c1',
        cid: 'cid1',
        author: { handle: 'h1', displayName: 'd1', avatar: 'a1' },
        record: { text: 't1' },
        indexedAt: '2024-01-02T01:00:00.000Z',
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        embed: null,
        embeds: null,
        labels: null,
        viewer: null,
      },
    };

    const feedItemReplyHandle = {
      post: {
        uri: 'c3',
        cid: 'cid3',
        author: { handle: 'h3', displayName: 'd3', avatar: 'a3' },
        record: { text: 't3', reply: { parent: { author: { handle: 'ph', displayName: 'pa3' }, record: { text: 'pt' } } } },
        indexedAt: '2024-01-02T03:00:00.000Z',
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        embed: null,
        embeds: null,
        labels: null,
        viewer: null,
      },
    };

    const feedItemReplyNoHandle = {
      post: {
        uri: 'c4',
        cid: 'cid4',
        author: { handle: 'h4', displayName: 'd4', avatar: 'a4' },
        record: { text: 't4', reply: { parent: { author: {}, record: {} } } },
        indexedAt: '2024-01-02T04:00:00.000Z',
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        embed: null,
        embeds: null,
        labels: null,
        viewer: null,
      },
    };

    const direct = {
      uri: 'c2',
      cid: 'cid2',
      author: { handle: 'h2', displayName: 'd2', avatar: 'a2' },
      record: { text: 't2' },
      indexedAt: '2024-01-02T02:00:00.000Z',
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      embed: null,
      embeds: null,
      labels: null,
      viewer: null,
    };

    const tree = (
      <>
        {renderComment(feedItemNoReply as any)}
        {renderComment(feedItemReplyHandle as any)}
        {renderComment(feedItemReplyNoHandle as any)}
        {renderComment(direct as any)}
      </>
    );
    const { getByText } = render(tree);
    for (const id of ['c1', 'c2', 'c3', 'c4']) {
      expect(getByText(id)).toBeTruthy();
    }
  });
});

