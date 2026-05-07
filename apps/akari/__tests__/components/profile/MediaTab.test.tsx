import { fireEvent, render } from '@testing-library/react-native';

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

  it('renders a 2-up grid and navigates to a post when its tile is pressed', () => {
    const media: MediaItem[] = [
      {
        uri: 'at://did:plc:user1/app.bsky.feed.post/post1',
        indexedAt: '2024-01-01T00:00:00Z',
        record: { text: 'hello' },
        author: { handle: 'user1', displayName: 'User 1', avatar: 'a' },
      },
      {
        uri: undefined,
        indexedAt: '2024-01-02T00:00:00Z',
        record: { text: 'skip — no uri, filtered out' },
        author: { handle: 'user2' },
      },
      {
        uri: 'at://did:plc:user3/app.bsky.feed.post/post3',
        indexedAt: '2024-01-03T00:00:00Z',
        record: { text: 'world' },
        author: { handle: 'user3' },
      },
    ];

    mockUseAuthorMedia.mockReturnValue({
      data: media,
      isLoading: false,
    });

    const { getAllByRole } = render(<MediaTab handle="alice" />);

    // Two valid posts → two tiles (the placeholder for the trailing odd row
    // is a plain View, not a button).
    const tiles = getAllByRole('button');
    expect(tiles).toHaveLength(2);

    fireEvent.press(tiles[0]);
    expect(router.push).toHaveBeenCalledWith('/(tabs)/index/user-profile/user1/post/post1');

    fireEvent.press(tiles[1]);
    expect(router.push).toHaveBeenCalledWith('/(tabs)/index/user-profile/user3/post/post3');
  });

  it('does not render PostCard — media tiles render their own UI', () => {
    mockUseAuthorMedia.mockReturnValue({
      data: [
        {
          uri: 'at://post1',
          indexedAt: '2024-01-01T00:00:00Z',
          record: { text: 'hello' },
          author: { handle: 'user1', displayName: 'User 1' },
        } as MediaItem,
      ],
      isLoading: false,
    });

    render(<MediaTab handle="alice" />);
    expect(PostCardMock).not.toHaveBeenCalled();
  });
});
