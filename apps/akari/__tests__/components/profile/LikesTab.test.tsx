import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { LikesTab } from '@/components/profile/LikesTab';
import { useAuthorLikes } from '@/hooks/queries/useAuthorLikes';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('@/hooks/queries/useAuthorLikes');
jest.mock('@/hooks/useTranslation');
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
  usePathname: jest.fn(() => '/profile'),
}));
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
});

describe('LikesTab', () => {
  it('renders loading skeleton', () => {
    mockUseAuthorLikes.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getByText } = render(<LikesTab handle="tester" />);
    expect(getByText('loading skeleton')).toBeTruthy();
  });

  it('renders empty state when there are no likes', () => {
    mockUseAuthorLikes.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { getByText } = render(<LikesTab handle="tester" />);
    expect(getByText('profile.noLikes')).toBeTruthy();
  });

  it('renders likes and navigates to post on press', () => {
    const like = createLike();
    mockUseAuthorLikes.mockReturnValue({
      data: [like],
      isLoading: false,
    });

    const { getByText } = render(<LikesTab handle="tester" />);
    fireEvent.press(getByText('liked post'));
    expect(router.push).toHaveBeenCalledWith(`/(tabs)/index/user-profile/tester/post/1`);
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
