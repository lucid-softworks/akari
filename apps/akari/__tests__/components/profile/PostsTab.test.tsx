import { act, fireEvent, render } from '@testing-library/react-native';
import { FlatList } from 'react-native';

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
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

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
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<PostsTab handle="alice" />);
    expect(getByText('feed-skeleton')).toBeTruthy();
  });

  it('renders empty state when no posts are returned', () => {
    mockUseAuthorPosts.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
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
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { getByRole } = render(<PostsTab handle="alice" />);

    expect(mockPostCard).toHaveBeenCalledTimes(1);
    const button = getByRole('button');
    fireEvent.press(button);
    expect(router.push).toHaveBeenCalledWith(`/post/${encodeURIComponent(post.uri)}`);
    const call = mockPostCard.mock.calls[0][0];
    expect(call.post.replyTo).toEqual({
      author: { handle: 'bob', displayName: 'Bob' },
      text: 'parent',
    });
  });

  it('fetches next page when end of list is reached', () => {
    const fetchNextPage = jest.fn();
    mockUseAuthorPosts.mockReturnValue({
      data: [{ uri: 'at://p', indexedAt: '1', record: {}, author: { handle: 'a' } }],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { UNSAFE_getByType } = render(<PostsTab handle="alice" />);
    act(() => {
      UNSAFE_getByType(FlatList).props.onEndReached();
    });
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('does not fetch next page when already fetching and shows footer', () => {
    const fetchNextPage = jest.fn();
    mockUseAuthorPosts.mockReturnValue({
      data: [{ uri: 'at://p', indexedAt: '1', record: {}, author: { handle: 'a' } }],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText, UNSAFE_getByType } = render(<PostsTab handle="alice" />);
    expect(getByText('common.loading')).toBeTruthy();
    act(() => {
      UNSAFE_getByType(FlatList).props.onEndReached();
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});

