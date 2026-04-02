import { render } from '@testing-library/react-native';

import { MediaTab } from '@/components/profile/MediaTab';
import { useAuthorMedia } from '@/hooks/queries/useAuthorMedia';
import { router } from 'expo-router';

jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

jest.mock('@/hooks/queries/useAuthorMedia');
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  usePathname: jest.fn(() => '/profile'),
}));
jest.mock('@/components/PostCard', () => ({ PostCard: jest.fn(() => null) }));
jest.mock('@/components/skeletons', () => ({ FeedSkeleton: jest.fn(() => null) }));
jest.mock('@/hooks/useThemeColor', () => ({ useThemeColor: () => '#000' }));

const PostCardMock = require('@/components/PostCard').PostCard as jest.Mock;
const FeedSkeletonMock = require('@/components/skeletons').FeedSkeleton as jest.Mock;
const mockUseAuthorMedia = useAuthorMedia as jest.Mock;

type MediaItem = {
  uri?: string;
  indexedAt: string;
  record?: { text?: string };
  author: { handle: string; displayName?: string; avatar?: string };
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  embed?: any;
  embeds?: any[];
  labels?: any;
  viewer?: any;
  cid?: string;
};

describe('MediaTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton when fetching media', () => {
    mockUseAuthorMedia.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<MediaTab handle="alice" />);
    expect(FeedSkeletonMock).toHaveBeenCalledTimes(1);
    expect(FeedSkeletonMock.mock.calls[0][0]).toMatchObject({ count: 3 });
  });

  it('shows empty state when no media is available', () => {
    mockUseAuthorMedia.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { getByText } = render(<MediaTab handle="alice" />);
    expect(getByText('profile.noMedia')).toBeTruthy();
  });

  it('shows empty state when filtered media has no valid entries', () => {
    mockUseAuthorMedia.mockReturnValue({
      data: [
        {
          uri: undefined,
          indexedAt: '2024-01-01T00:00:00Z',
          author: { handle: 'user1' },
        },
      ],
      isLoading: false,
    });

    const { getByText } = render(<MediaTab handle="alice" />);
    expect(getByText('profile.noMedia')).toBeTruthy();
  });

  it('renders posts and navigates to post on press', () => {
    const media: MediaItem[] = [
      {
        uri: 'at://post1',
        indexedAt: '2024-01-01T00:00:00Z',
        record: { text: 'hello' },
        author: { handle: 'user1', displayName: 'User 1', avatar: 'a' },
      },
      {
        uri: undefined,
        indexedAt: '2024-01-02T00:00:00Z',
        record: { text: 'skip' },
        author: { handle: 'user2' },
      },
    ];

    mockUseAuthorMedia.mockReturnValue({
      data: media,
      isLoading: false,
    });

    render(<MediaTab handle="alice" />);

    expect(PostCardMock).toHaveBeenCalledTimes(1);
    const press = PostCardMock.mock.calls[0][0].onPress;
    press();
    expect(router.push).toHaveBeenCalledWith('/(tabs)/index/user-profile/user1/post/post1');
  });

  it('formats reply data and uses unknown handle when missing', () => {
    const media: MediaItem[] = [
      {
        uri: 'at://p1',
        indexedAt: '2024-01-01T00:00:00Z',
        record: { text: 'with handle' },
        author: { handle: 'user1', displayName: 'User 1' },
        reply: {
          parent: {
            author: { handle: 'bob', displayName: 'Bob' },
            record: { text: 'parent' },
          },
        },
      } as any,
      {
        uri: 'at://p2',
        indexedAt: '2024-01-02T00:00:00Z',
        record: { text: 'without handle' },
        author: { handle: 'user2', displayName: 'User 2' },
        reply: {
          parent: {
            author: { displayName: 'Anon' },
            record: { text: 'mystery' },
          },
        },
      } as any,
    ];

    mockUseAuthorMedia.mockReturnValue({
      data: media,
      isLoading: false,
    });

    render(<MediaTab handle="alice" />);
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
