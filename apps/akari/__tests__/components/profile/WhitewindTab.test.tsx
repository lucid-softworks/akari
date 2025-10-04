import { act, render } from '@testing-library/react-native';

import { WhitewindTab } from '@/components/profile/WhitewindTab';
import { useAuthorWhtwndPosts } from '@/hooks/queries/useAuthorWhtwndPosts';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { VirtualizedList } from '@/components/ui/VirtualizedList';

jest.mock('@/hooks/queries/useAuthorWhtwndPosts');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return {
    FeedSkeleton: () => <Text>feed skeleton</Text>,
  };
});
jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

const mockUseAuthorWhtwndPosts = useAuthorWhtwndPosts as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('WhitewindTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockImplementation((colors: { light?: string }) => colors.light ?? '#000');
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  });

  it('shows loading skeleton while fetching data', () => {
    mockUseAuthorWhtwndPosts.mockReturnValue({
      data: [],
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<WhitewindTab handle="alice" isOwnProfile />);
    expect(getByText('feed skeleton')).toBeTruthy();
  });

  it('renders empty state when no posts exist', () => {
    mockUseAuthorWhtwndPosts.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<WhitewindTab handle="alice" isOwnProfile={false} />);
    expect(getByText('profile.noPosts')).toBeTruthy();
  });

  it('filters private posts for visitors', () => {
    mockUseAuthorWhtwndPosts.mockReturnValue({
      data: [
        {
          uri: 'at://post/1',
          value: {
            $type: 'com.whtwnd.blog.entry',
            title: 'Private note',
            content: 'secret',
            createdAt: new Date().toISOString(),
            visibility: 'author',
          },
        },
        {
          uri: 'at://post/2',
          value: {
            $type: 'com.whtwnd.blog.entry',
            title: 'Public note',
            content: 'hello world',
            createdAt: new Date().toISOString(),
            visibility: 'public',
          },
        },
      ],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText, queryByText } = render(
      <WhitewindTab handle="alice" isOwnProfile={false} />,
    );

    expect(getByText('Public note')).toBeTruthy();
    expect(queryByText('Private note')).toBeNull();
  });

  it('renders posts and loads more on end reach', () => {
    const fetchNextPage = jest.fn();
    const posts = [
      {
        uri: 'at://post/1',
        value: {
          $type: 'com.whtwnd.blog.entry',
          title: 'Hello',
          content: 'welcome to whitewind',
          createdAt: new Date().toISOString(),
          visibility: 'public',
        },
      },
    ];

    mockUseAuthorWhtwndPosts.mockReturnValue({
      data: posts,
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { getByText, UNSAFE_getByType, queryByText } = render(
      <WhitewindTab handle="alice" isOwnProfile />,
    );

    expect(getByText('Hello')).toBeTruthy();
    expect(queryByText('common.loading')).toBeNull();

    act(() => {
      UNSAFE_getByType(VirtualizedList).props.onEndReached();
    });

    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer when fetching next page', () => {
    mockUseAuthorWhtwndPosts.mockReturnValue({
      data: [
        {
          uri: 'at://post/1',
          value: {
            $type: 'com.whtwnd.blog.entry',
            title: 'Hello',
            content: 'welcome',
            createdAt: new Date().toISOString(),
            visibility: 'public',
          },
        },
      ],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText } = render(<WhitewindTab handle="alice" isOwnProfile />);
    expect(getByText('common.loading')).toBeTruthy();
  });

  it('does not fetch when no more posts are available', () => {
    const fetchNextPage = jest.fn();
    mockUseAuthorWhtwndPosts.mockReturnValue({
      data: [
        {
          uri: 'at://post/1',
          value: {
            $type: 'com.whtwnd.blog.entry',
            title: 'Hello',
            content: 'welcome',
            createdAt: new Date().toISOString(),
            visibility: 'public',
          },
        },
      ],
      isLoading: false,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { UNSAFE_getByType } = render(<WhitewindTab handle="alice" isOwnProfile />);
    act(() => {
      UNSAFE_getByType(VirtualizedList).props.onEndReached();
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});
