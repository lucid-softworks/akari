import { fireEvent, render } from '@testing-library/react-native';
import { FlashList } from '@shopify/flash-list';

import { FeedsTab } from '@/components/profile/FeedsTab';
import { useAuthorFeeds } from '@/hooks/queries/useAuthorFeeds';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { BlueskyFeed } from '@/bluesky-api';

jest.mock('@/hooks/queries/useAuthorFeeds');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { FeedSkeleton: () => <Text testID="feed-skeleton" /> };
});
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: () => null }));

const mockUseAuthorFeeds = useAuthorFeeds as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('FeedsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  });

  it('renders loading skeleton while feeds are loading', () => {
    mockUseAuthorFeeds.mockReturnValue({
      data: undefined,
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByTestId } = render(<FeedsTab handle="user.test" />);
    expect(getByTestId('feed-skeleton')).toBeTruthy();
  });

  it('renders empty state when no feeds are available', () => {
    mockUseAuthorFeeds.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<FeedsTab handle="user.test" />);
    expect(getByText('profile.noFeeds')).toBeTruthy();
  });

  it('renders feeds and loads more when scrolled to end', () => {
    const fetchNextPage = jest.fn();
    const feeds = [
      {
        uri: 'at://example/feed',
        displayName: 'Test Feed',
        description: 'Feed description',
        creator: { handle: 'alice' },
        likeCount: 5,
        acceptsInteractions: true,
      },
    ] as unknown as BlueskyFeed[];

    mockUseAuthorFeeds.mockReturnValue({
      data: feeds,
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { getByText, UNSAFE_getByType } = render(<FeedsTab handle="user.test" />);

    expect(getByText('Test Feed')).toBeTruthy();
    expect(getByText('by @alice')).toBeTruthy();
    expect(getByText('5 likes')).toBeTruthy();
    expect(getByText('Interactive')).toBeTruthy();

    const list = UNSAFE_getByType(FlashList);
    fireEvent(list, 'onEndReached');
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer while fetching next page', () => {
    const feeds = [
      {
        uri: 'at://example/feed',
        displayName: 'Test Feed',
        description: 'Feed description',
        creator: { handle: 'alice' },
        likeCount: 5,
        acceptsInteractions: true,
      },
    ] as unknown as BlueskyFeed[];

    mockUseAuthorFeeds.mockReturnValue({
      data: feeds,
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText } = render(<FeedsTab handle="user.test" />);
    expect(getByText('common.loading')).toBeTruthy();
  });
});

