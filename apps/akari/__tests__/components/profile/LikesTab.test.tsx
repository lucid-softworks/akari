import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { LikesTab } from '@/components/profile/LikesTab';
import { useAuthorLikes } from '@/hooks/queries/useAuthorLikes';
import { useTranslation } from '@/hooks/useTranslation';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useTabNavigation } from '@/hooks/useTabNavigation';

jest.mock('@/hooks/queries/useAuthorLikes');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useTabNavigation');
jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));
jest.mock('@/components/skeletons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FeedSkeleton: () => <Text>loading skeleton</Text>,
  };
});
jest.mock('@/components/PostCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PostCard: jest.fn(({ post, onPress }: { post: any; onPress: () => void }) => (
      <Text onPress={onPress}>{post.text}</Text>
    )),
  };
});

const mockUseAuthorLikes = useAuthorLikes as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const PostCardMock = require('@/components/PostCard').PostCard as jest.Mock;
const mockUseTabNavigation = useTabNavigation as jest.Mock;
let openPost: jest.Mock;

type Like = {
  uri: string;
  indexedAt: string;
  record: { text: string; facets: unknown[] };
  author: { handle: string; displayName: string; avatar: string };
  likeCount: number;
  replyCount: number;
  repostCount: number;
  embed: unknown;
  embeds: unknown[];
  labels: unknown[];
  viewer: unknown;
  cid: string;
  reply?: unknown;
};

const createLike = (overrides: Partial<Like> = {}): Like => ({
  uri: 'at://did:plc:test/app.bsky.feed.post/1',
  indexedAt: '2024-01-01T00:00:00.000Z',
  record: { text: 'liked post', facets: [] },
  author: { handle: 'tester', displayName: 'Tester', avatar: '' },
  likeCount: 0,
  replyCount: 0,
  repostCount: 0,
  embed: null,
  embeds: [],
  labels: [],
  viewer: {},
  cid: 'cid',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  openPost = jest.fn();
  mockUseTabNavigation.mockReturnValue({
    activeTab: 'index',
    isSharedRouteFocused: false,
    navigateToTabRoot: jest.fn(),
    openPost,
    openProfile: jest.fn(),
  });
});

describe('LikesTab', () => {
  it('renders loading skeleton', () => {
    mockUseAuthorLikes.mockReturnValue({
      data: undefined,
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<LikesTab handle="tester" />);
    expect(getByText('loading skeleton')).toBeTruthy();
  });

  it('renders empty state when there are no likes', () => {
    mockUseAuthorLikes.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<LikesTab handle="tester" />);
    expect(getByText('profile.noLikes')).toBeTruthy();
  });

  it('renders likes and navigates to post on press', () => {
    const fetchNextPage = jest.fn();
    const like = createLike();
    mockUseAuthorLikes.mockReturnValue({
      data: [like],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { getByText, UNSAFE_getByType } = render(<LikesTab handle="tester" />);
    fireEvent.press(getByText('liked post'));
    expect(openPost).toHaveBeenCalledWith(like.uri);

    const list = UNSAFE_getByType(VirtualizedList);
    act(() => {
      list.props.onEndReached();
    });
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer and avoids fetching while already loading', () => {
    const fetchNextPage = jest.fn();
    mockUseAuthorLikes.mockReturnValue({
      data: [createLike()],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText, UNSAFE_getByType } = render(<LikesTab handle="tester" />);
    expect(getByText('common.loading')).toBeTruthy();

    const list = UNSAFE_getByType(VirtualizedList);
    act(() => {
      list.props.onEndReached();
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('formats reply information and falls back to unknown handle', () => {
    const likeWithHandle = createLike({
      reply: {
        parent: {
          author: { handle: 'bob', displayName: 'Bob' },
          record: { text: 'parent' },
        },
      },
    } as any);

    const likeWithoutHandle = createLike({
      uri: 'at://did:plc:test/app.bsky.feed.post/2',
      indexedAt: '2024-01-02T00:00:00.000Z',
      reply: {
        parent: {
          author: { displayName: 'Anon' },
          record: { text: 'mystery' },
        },
      },
    } as any);

    mockUseAuthorLikes.mockReturnValue({
      data: [likeWithHandle, likeWithoutHandle],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<LikesTab handle="tester" />);
    expect(PostCardMock).toHaveBeenCalledTimes(2);
    const first = PostCardMock.mock.calls[0][0].post.replyTo;
    const second = PostCardMock.mock.calls[1][0].post.replyTo;
    expect(first).toEqual({
      author: { handle: 'bob', displayName: 'Bob' },
      text: 'parent',
    });
    expect(second).toEqual({
      author: { handle: 'unknown', displayName: 'Anon' },
      text: 'mystery',
    });
  });
});

