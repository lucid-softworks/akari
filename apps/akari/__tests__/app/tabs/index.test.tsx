import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import HomeScreen from '@/app/(tabs)/index/index';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useFeed } from '@/hooks/queries/useFeed';
import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { useTimeline } from '@/hooks/queries/useTimeline';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useFeedGenerators } from '@/hooks/queries/useFeedGenerators';
import { useSavedFeedsList } from '@/hooks/useSavedFeedsList';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('expo-router', () => ({ 
  router: { push: jest.fn() },
  usePathname: jest.fn(() => '/index'),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/PostCard', () => {
  const { Text } = require('react-native');
  return { PostCard: ({ post }: any) => <Text>{post.text}</Text> };
});

jest.mock('@/components/PostComposer', () => {
  const { Text } = require('react-native');
  return {
    PostComposer: ({ visible }: { visible: boolean }) => (visible ? <Text>composer</Text> : null),
  };
});

jest.mock('@/components/ReviewComposer', () => ({
  ReviewComposer: () => null,
}));

jest.mock('@/components/PollComposer', () => ({
  PollComposer: () => null,
}));

jest.mock('@/components/TabBar', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    TabBar: ({ tabs, activeTab, onTabChange }: any) => (
      <View>
        {tabs.map((t: any) => (
          <TouchableOpacity key={t.key} onPress={() => onTabChange(t.key)}>
            <Text>{t.label}</Text>
            {activeTab === t.key && <Text>active</Text>}
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: (props: any) => <View {...props} /> };
});

jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { FeedSkeleton: () => <Text>loading</Text> };
});

jest.mock('@/components/ui/IconSymbol', () => {
  const { Text } = require('react-native');
  return { IconSymbol: ({ name }: { name: string }) => <Text>icon-{name}</Text> };
});

jest.mock('@/components/FeedFiltersSheet', () => ({
  FeedFiltersSheet: () => null,
}));

jest.mock('@/components/TrendingBar', () => ({
  TrendingBar: () => null,
}));

jest.mock('@/hooks/queries/useMutedWords', () => ({
  useMutedWords: () => ({ data: [] }),
}));

jest.mock('@/hooks/useFeedFilters', () => ({
  useFeedFilters: () => ({ filters: {}, anyFilterActive: false }),
}));

jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000',
}));

jest.mock('@/hooks/useBorderColor', () => ({
  useBorderColor: () => '#ccc',
}));

jest.mock('@/utils/navigation', () => ({
  useNavigateToPost: () => jest.fn(),
  useNavigateToProfile: () => jest.fn(),
  useNavigateToFeed: () => jest.fn(),
  useProfileHref: () => () => '/profile/test',
}));

jest.mock('@/hooks/mutations/useSetSelectedFeed');
jest.mock('@/hooks/queries/useSelectedFeed');
jest.mock('@/hooks/queries/useFeed');
jest.mock('@/hooks/queries/useTimeline');
jest.mock('@/hooks/queries/useIsGuest');
jest.mock('@/hooks/queries/useFeedGenerators');
jest.mock('@/hooks/useSavedFeedsList');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useResponsive');
jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: { register: jest.fn() },
}));

const mockUseSetSelectedFeed = useSetSelectedFeed as jest.Mock;
const mockUseSavedFeedsList = useSavedFeedsList as jest.Mock;
const mockUseSelectedFeed = useSelectedFeed as jest.Mock;
const mockUseFeed = useFeed as jest.Mock;
const mockUseTimeline = useTimeline as jest.Mock;
const mockUseIsGuest = useIsGuest as jest.Mock;
const mockUseFeedGenerators = useFeedGenerators as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;

// The home screen resolves the feed tab strip through useSavedFeedsList and
// the actual feed/timeline data through the useHomeFeed hook (which still
// reads useFeed / useTimeline directly — left unmocked-internally so the
// empty / loading / posts list logic runs for real over the mocked queries).
// `feeds` is the flattened tab list: { uri, displayName }[].
const setSavedFeedsList = (
  feeds: { uri: string; displayName: string }[],
  overrides: Partial<{ savedFeedsLoading: boolean; feedsLoading: boolean }> = {},
) => {
  mockUseSavedFeedsList.mockReturnValue({
    allFeedsWithCreated: feeds,
    savedFeedsLoading: overrides.savedFeedsLoading ?? false,
    feedsLoading: overrides.feedsLoading ?? false,
    refetchFeeds: jest.fn(),
  });
};

// useFeed is consumed by useHomeFeed; it returns `posts` (render-ready) plus
// the raw infinite-query fields. Build a matching shape from a page list.
const setFeed = (
  pages: { feed: any[] }[],
  overrides: Partial<{ isLoading: boolean; hasNextPage: boolean; isFetchingNextPage: boolean }> = {},
) => {
  const posts = pages.flatMap((page) => page.feed);
  mockUseFeed.mockReturnValue({
    data: { pages },
    posts,
    isLoading: overrides.isLoading ?? false,
    fetchNextPage: jest.fn(),
    hasNextPage: overrides.hasNextPage ?? false,
    isFetchingNextPage: overrides.isFetchingNextPage ?? false,
    refetch: jest.fn(),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTranslation.mockReturnValue({ t: (k: string) => k });
  mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  mockUseIsGuest.mockReturnValue(false);
  mockUseFeedGenerators.mockReturnValue({ data: undefined });
});

describe('HomeScreen', () => {
  const buildPost = (uri: string, text: string, handle = 'alice') => ({
    post: {
      uri,
      record: { text },
      author: { did: `did:${handle}`, handle, displayName: handle, avatar: '' },
      indexedAt: new Date().toISOString(),
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      embed: null,
      embeds: [],
      labels: [],
      viewer: {},
      cid: `${uri}-cid`,
    },
  });

  it('renders posts and handles feed changes', () => {
    setSavedFeedsList([
      { uri: 'feed1', displayName: 'Feed One' },
      { uri: 'feed2', displayName: 'Feed Two' },
    ]);
    const mutate = jest.fn();
    mockUseSetSelectedFeed.mockReturnValue({ mutate });
    mockUseSelectedFeed.mockReturnValue({ data: 'feed1' });
    setFeed([{ feed: [buildPost('p1', 'Post 1')] }]);
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false, refetch: jest.fn() });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('Feed One')).toBeTruthy();
    expect(getByText('Feed Two')).toBeTruthy();
    expect(getByText('Post 1')).toBeTruthy();

    fireEvent.press(getByText('Feed Two'));
    expect(mutate).toHaveBeenCalledWith('feed2');

    expect(tabScrollRegistry.register).toHaveBeenCalledWith('index', expect.any(Function));
  });

  it('prompts to select a feed when none is chosen', () => {
    setSavedFeedsList([{ uri: 'feed1', displayName: 'Feed One' }]);
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: null });
    setFeed([]);
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false, refetch: jest.fn() });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('feed.selectFeedToView')).toBeTruthy();
  });

  it('shows empty state when feed has no posts', () => {
    setSavedFeedsList([{ uri: 'feed1', displayName: 'Feed One' }]);
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: 'feed1' });
    setFeed([{ feed: [] }]);
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false, refetch: jest.fn() });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('feed.noPostsInFeed')).toBeTruthy();
  });

  it('shows loading state while feeds are loading', () => {
    setSavedFeedsList([], { savedFeedsLoading: true, feedsLoading: true });
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: null });
    setFeed([], { isLoading: true });
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: true, refetch: jest.fn() });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('feed.loadingFeeds')).toBeTruthy();
  });

  it('renders timeline posts when the following feed is selected', () => {
    setSavedFeedsList([
      { uri: 'following', displayName: 'Following' },
      { uri: 'feed1', displayName: 'Feed One' },
    ]);
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: 'following' });
    setFeed([]);
    mockUseTimeline.mockReturnValue({
      data: { feed: [buildPost('timeline-post', 'Timeline Post', 'bob')] },
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('Following')).toBeTruthy();
    expect(getByText('Timeline Post')).toBeTruthy();
  });

  it('shows loading indicator when fetching additional posts', () => {
    setSavedFeedsList([{ uri: 'feed1', displayName: 'Feed One' }]);
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: 'feed1' });
    setFeed([{ feed: [buildPost('p1', 'Post 1')] }], { hasNextPage: true, isFetchingNextPage: true });
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false, refetch: jest.fn() });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('Post 1')).toBeTruthy();
    expect(getByText('feed.loadingMorePosts')).toBeTruthy();
  });

  it('opens the post composer when the compose button is pressed', () => {
    setSavedFeedsList([{ uri: 'feed1', displayName: 'Feed One' }]);
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: 'feed1' });
    setFeed([{ feed: [buildPost('p1', 'Post 1')] }]);
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false, refetch: jest.fn() });

    const { getByText, queryByText } = render(<HomeScreen />);

    expect(queryByText('composer')).toBeNull();
    // FAB opens a menu first, then select "Post"
    fireEvent.press(getByText('icon-plus'));
    fireEvent.press(getByText('home.fabPost'));
    expect(getByText('composer')).toBeTruthy();
  });
});
