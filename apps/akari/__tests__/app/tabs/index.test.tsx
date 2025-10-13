import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import HomeScreen from '@/app/(tabs)/index/index';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeed } from '@/hooks/queries/useFeed';
import { useFeeds } from '@/hooks/queries/useFeeds';
import { useSavedFeeds } from '@/hooks/queries/usePreferences';
import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { useTimeline } from '@/hooks/queries/useTimeline';
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

jest.mock('@/components/TabBar', () => {
  const React = require('react');
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
  return { IconSymbol: () => <Text>icon</Text> };
});

jest.mock('@/hooks/mutations/useSetSelectedFeed');
jest.mock('@/hooks/queries/useFeeds');
jest.mock('@/hooks/queries/usePreferences');
jest.mock('@/hooks/queries/useSelectedFeed');
jest.mock('@/hooks/queries/useFeed');
jest.mock('@/hooks/queries/useTimeline');
jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useResponsive');
jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: { register: jest.fn() },
}));

const mockUseSetSelectedFeed = useSetSelectedFeed as jest.Mock;
const mockUseFeeds = useFeeds as jest.Mock;
const mockUseSavedFeeds = useSavedFeeds as jest.Mock;
const mockUseSelectedFeed = useSelectedFeed as jest.Mock;
const mockUseFeed = useFeed as jest.Mock;
const mockUseTimeline = useTimeline as jest.Mock;
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTranslation.mockReturnValue({ t: (k: string) => k });
  mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  mockUseCurrentAccount.mockReturnValue({ data: { did: 'did', handle: 'user' } });
});

describe('HomeScreen', () => {
  it('renders posts and handles feed changes', () => {
    mockUseSavedFeeds.mockReturnValue({
      data: [{ type: 'feed', metadata: { uri: 'feed1', displayName: 'Feed One' } }],
      isLoading: false,
    });
    mockUseFeeds.mockReturnValue({
      data: { feeds: [{ uri: 'feed2', displayName: 'Feed Two' }] },
      isLoading: false,
      refetch: jest.fn(),
    });
    const mutate = jest.fn();
    mockUseSetSelectedFeed.mockReturnValue({ mutate });
    mockUseSelectedFeed.mockReturnValue({ data: 'feed1' });
    mockUseFeed.mockReturnValue({
      data: {
        pages: [
          {
            feed: [
              {
                post: {
                  uri: 'p1',
                  record: { text: 'Post 1' },
                  author: { handle: 'alice', displayName: 'Alice', avatar: '' },
                  indexedAt: new Date().toISOString(),
                  likeCount: 0,
                  replyCount: 0,
                  repostCount: 0,
                  embed: null,
                  embeds: [],
                  labels: [],
                  viewer: {},
                  cid: 'cid1',
                },
              },
            ],
          },
        ],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('Feed One')).toBeTruthy();
    expect(getByText('Feed Two')).toBeTruthy();
    expect(getByText('Post 1')).toBeTruthy();

    fireEvent.press(getByText('Feed Two'));
    expect(mutate).toHaveBeenCalledWith('feed2');

    expect(tabScrollRegistry.register).toHaveBeenCalledWith('index', expect.any(Function));
  });

  it('prompts to select a feed when none is chosen', () => {
    mockUseSavedFeeds.mockReturnValue({
      data: [{ type: 'feed', metadata: { uri: 'feed1', displayName: 'Feed One' } }],
      isLoading: false,
    });
    mockUseFeeds.mockReturnValue({ data: { feeds: [] }, isLoading: false, refetch: jest.fn() });
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: null });
    mockUseFeed.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('feed.selectFeedToView')).toBeTruthy();
  });

  it('shows empty state when feed has no posts', () => {
    mockUseSavedFeeds.mockReturnValue({
      data: [{ type: 'feed', metadata: { uri: 'feed1', displayName: 'Feed One' } }],
      isLoading: false,
    });
    mockUseFeeds.mockReturnValue({ data: { feeds: [] }, isLoading: false, refetch: jest.fn() });
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: 'feed1' });
    mockUseFeed.mockReturnValue({
      data: { pages: [{ feed: [] }] },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('feed.noPostsInFeed')).toBeTruthy();
  });

  it('shows loading state while feeds are loading', () => {
    mockUseSavedFeeds.mockReturnValue({
      data: [],
      isLoading: true,
    });
    mockUseFeeds.mockReturnValue({
      data: { feeds: [] },
      isLoading: true,
      refetch: jest.fn(),
    });
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: null });
    mockUseFeed.mockReturnValue({
      data: { pages: [] },
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: true });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('feed.loadingFeeds')).toBeTruthy();
  });

  it('renders timeline posts when the following feed is selected', () => {
    mockUseSavedFeeds.mockReturnValue({
      data: [
        { type: 'timeline', value: 'following' },
        { type: 'feed', metadata: { uri: 'feed1', displayName: 'Feed One' } },
      ],
      isLoading: false,
    });
    mockUseFeeds.mockReturnValue({ data: { feeds: [] }, isLoading: false, refetch: jest.fn() });
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: 'following' });
    mockUseFeed.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });
    mockUseTimeline.mockReturnValue({
      data: {
        feed: [
          {
            post: {
              uri: 'timeline-post',
              record: { text: 'Timeline Post' },
              author: { handle: 'bob', displayName: 'Bob', avatar: '' },
              indexedAt: new Date().toISOString(),
              likeCount: 0,
              replyCount: 0,
              repostCount: 0,
              embed: null,
              embeds: [],
              labels: [],
              viewer: {},
              cid: 'timeline-post',
            },
          },
        ],
      },
      isLoading: false,
    });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('Following')).toBeTruthy();
    expect(getByText('Timeline Post')).toBeTruthy();
  });

  it('shows loading indicator when fetching additional posts', () => {
    mockUseSavedFeeds.mockReturnValue({
      data: [{ type: 'feed', metadata: { uri: 'feed1', displayName: 'Feed One' } }],
      isLoading: false,
    });
    mockUseFeeds.mockReturnValue({ data: { feeds: [] }, isLoading: false, refetch: jest.fn() });
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: 'feed1' });
    mockUseFeed.mockReturnValue({
      data: {
        pages: [
          {
            feed: [
              {
                post: {
                  uri: 'p1',
                  record: { text: 'Post 1' },
                  author: { handle: 'alice', displayName: 'Alice', avatar: '' },
                  indexedAt: new Date().toISOString(),
                  likeCount: 0,
                  replyCount: 0,
                  repostCount: 0,
                  embed: null,
                  embeds: [],
                  labels: [],
                  viewer: {},
                  cid: 'cid1',
                },
              },
            ],
          },
        ],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
      refetch: jest.fn(),
    });
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('Post 1')).toBeTruthy();
    expect(getByText('feed.loadingMorePosts')).toBeTruthy();
  });

  it('opens the post composer when the compose button is pressed', () => {
    mockUseSavedFeeds.mockReturnValue({
      data: [{ type: 'feed', metadata: { uri: 'feed1', displayName: 'Feed One' } }],
      isLoading: false,
    });
    mockUseFeeds.mockReturnValue({ data: { feeds: [] }, isLoading: false, refetch: jest.fn() });
    mockUseSetSelectedFeed.mockReturnValue({ mutate: jest.fn() });
    mockUseSelectedFeed.mockReturnValue({ data: 'feed1' });
    mockUseFeed.mockReturnValue({
      data: {
        pages: [
          {
            feed: [
              {
                post: {
                  uri: 'p1',
                  record: { text: 'Post 1' },
                  author: { handle: 'alice', displayName: 'Alice', avatar: '' },
                  indexedAt: new Date().toISOString(),
                  likeCount: 0,
                  replyCount: 0,
                  repostCount: 0,
                  embed: null,
                  embeds: [],
                  labels: [],
                  viewer: {},
                  cid: 'cid1',
                },
              },
            ],
          },
        ],
      },
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });
    mockUseTimeline.mockReturnValue({ data: { feed: [] }, isLoading: false });

    const { getByText, queryByText } = render(<HomeScreen />);

    expect(queryByText('composer')).toBeNull();
    fireEvent.press(getByText('icon'));
    expect(getByText('composer')).toBeTruthy();
  });
});
