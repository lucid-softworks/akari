import { fireEvent, render } from '@testing-library/react-native';

let mockPostCard: jest.Mock;

jest.mock('@/components/skeletons', () => ({
  FeedSkeleton: () => {
    const { Text } = require('react-native');
    return <Text>feed-skeleton</Text>;
  },
}));

jest.mock('@/components/PostCard', () => {
  mockPostCard = jest.fn();
  return {
    PostCard: (props: any) => {
      mockPostCard(props);
      const { TouchableOpacity, Text } = require('react-native');
      return (
        <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
          <Text>{props.post.text}</Text>
        </TouchableOpacity>
      );
    },
  };
});

jest.mock('@/hooks/queries/useAuthorPosts');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useThemeColor');
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  usePathname: jest.fn(() => '/profile'),
}));
jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

import { PostsTab } from '@/components/profile/PostsTab';
import { useAuthorPosts } from '@/hooks/queries/useAuthorPosts';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { router } from 'expo-router';

describe('PostsTab', () => {
  const mockUseAuthorPosts = useAuthorPosts as jest.Mock;
  const mockUseTranslation = useTranslation as jest.Mock;
  const mockUseThemeColor = useThemeColor as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockUseThemeColor.mockReturnValue('#000');
  });

  it('renders loading skeleton while fetching posts', () => {
    mockUseAuthorPosts.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getByText } = render(<PostsTab handle="alice" />);
    expect(getByText('feed-skeleton')).toBeTruthy();
  });

  it('renders empty state when no posts are returned', () => {
    mockUseAuthorPosts.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { getByText } = render(<PostsTab handle="alice" />);
    expect(getByText('profile.noPosts')).toBeTruthy();
  });

  it('renders posts and navigates to detail on press', () => {
    const post = {
      uri: 'at://example/post',
      indexedAt: '2024-01-01T00:00:00Z',
      record: { text: 'hello' },
      author: { handle: 'alice', displayName: 'Alice', avatar: 'a' },
      reply: {
        parent: {
          author: { handle: 'bob', displayName: 'Bob' },
          record: { text: 'parent' },
        },
      },
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      cid: 'cid',
    };

    const invalid = { uri: undefined } as any;

    mockUseAuthorPosts.mockReturnValue({
      data: [post, invalid],
      isLoading: false,
    });

    const { getByRole } = render(<PostsTab handle="alice" />);

    expect(mockPostCard).toHaveBeenCalledTimes(1);
    const button = getByRole('button');
    fireEvent.press(button);
    expect(router.push).toHaveBeenCalledWith(`/(tabs)/index/user-profile/alice/post/post`);
    const call = mockPostCard.mock.calls[0][0];
    expect(call.post.replyTo).toEqual({
      author: { handle: 'bob', displayName: 'Bob' },
      text: 'parent',
    });
  });

  it('falls back to unknown when parent handle missing', () => {
    const post = {
      uri: 'at://example/post2',
      indexedAt: '2024-01-01T00:00:00Z',
      record: { text: 'child' },
      author: { handle: 'alice', displayName: 'Alice', avatar: 'a' },
      reply: {
        parent: {
          author: { displayName: 'NoHandle' },
          record: { text: 'parent' },
        },
      },
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      cid: 'cid',
    } as any;

    mockUseAuthorPosts.mockReturnValue({
      data: [post],
      isLoading: false,
    });

    render(<PostsTab handle="alice" />);
    const call = mockPostCard.mock.calls[0][0];
    expect(call.post.replyTo).toEqual({
      author: { handle: 'unknown', displayName: 'NoHandle' },
      text: 'parent',
    });
  });
});
