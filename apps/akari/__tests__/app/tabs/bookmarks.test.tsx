import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import BookmarksScreen from '@/app/(tabs)/bookmarks';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { useBookmarks } from '@/hooks/queries/useBookmarks';
import { useTranslation } from '@/hooks/useTranslation';
import { mockScrollToOffset } from '../../../test-utils/flash-list';
import { formatRelativeTime } from '@/utils/timeUtils';
import { useTabNavigation } from '@/hooks/useTabNavigation';

jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

jest.mock('@/hooks/useTabNavigation');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { FeedSkeleton: ({ count }: { count: number }) => <Text>loading {count}</Text> };
});

let capturedPostCardProps: any;

jest.mock('@/components/PostCard', () => {
  capturedPostCardProps = undefined;
  return {
    PostCard: (props: any) => {
      capturedPostCardProps = props;
      const { Text, TouchableOpacity } = require('react-native');
      return (
        <TouchableOpacity accessibilityRole="button" onPress={props.onPress}>
          <Text>{props.post.text}</Text>
        </TouchableOpacity>
      );
    },
  };
});

jest.mock('@/hooks/queries/useBookmarks');
jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: { register: jest.fn() },
}));

jest.mock('@/utils/timeUtils', () => ({
  formatRelativeTime: jest.fn(),
}));

const mockUseBookmarks = useBookmarks as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockRegister = tabScrollRegistry.register as jest.Mock;
const mockFormatRelativeTime = formatRelativeTime as jest.Mock;
const mockUseTabNavigation = useTabNavigation as jest.Mock;
const openPost = jest.fn();

function buildBookmark() {
  const parentPost = {
    uri: 'at://example.com/post/parent',
    cid: 'parent-cid',
    author: {
      did: 'did:parent',
      handle: undefined,
      displayName: 'Parent',
      avatar: 'parent.png',
    },
    record: { text: 'Parent post' },
    embed: null,
    embeds: [],
    indexedAt: '2024-03-01T00:00:00.000Z',
    labels: [],
    viewer: {},
    likeCount: 0,
    replyCount: 0,
    repostCount: 0,
  };

  return {
    createdAt: '2024-03-02T00:00:00.000Z',
    subject: { uri: 'at://example.com/post/1', cid: 'cid-1' },
    item: {
      uri: 'at://example.com/post/1',
      cid: 'cid-1',
      author: {
        did: 'did:alice',
        handle: 'alice',
        displayName: 'Alice',
        avatar: 'alice.png',
      },
      record: { text: 'Hello world', facets: [] },
      embed: null,
      embeds: [],
      indexedAt: '2024-03-02T00:00:00.000Z',
      labels: [],
      viewer: {},
      likeCount: 1,
      replyCount: 2,
      repostCount: 3,
      reply: {
        parent: parentPost,
        root: parentPost,
      },
    },
  };
}

describe('BookmarksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockFormatRelativeTime.mockReturnValue('relative-time');
    openPost.mockReset();
    mockUseTabNavigation.mockReturnValue({ activeTab: 'bookmarks', openPost, openProfile: jest.fn() });
  });

  it('renders bookmarks and handles interactions', async () => {
    const fetchNextPage = jest.fn();
    const refetch = jest.fn().mockResolvedValue(undefined);
    const bookmark = buildBookmark();

    mockUseBookmarks.mockReturnValue({
      data: { pages: [{ bookmarks: [bookmark] }] },
      isLoading: false,
      error: undefined,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
      refetch,
      isRefetching: false,
    });

    const { getByText, UNSAFE_getByType } = render(<BookmarksScreen />);

    expect(getByText('common.bookmarks')).toBeTruthy();
    expect(getByText('bookmarks.subtitle')).toBeTruthy();
    expect(getByText('Hello world')).toBeTruthy();

    expect(mockRegister).toHaveBeenCalledWith('bookmarks', expect.any(Function));

    const scrollCallback = mockRegister.mock.calls[0][1] as () => void;
    scrollCallback();
    expect(mockScrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });

    expect(mockFormatRelativeTime).toHaveBeenCalledWith('2024-03-02T00:00:00.000Z');
    expect(capturedPostCardProps.post.replyTo).toEqual({
      author: { displayName: 'Parent', handle: 'common.unknown' },
      text: 'Parent post',
    });

    fireEvent.press(getByText('Hello world'));
    expect(openPost).toHaveBeenCalledWith('at://example.com/post/1');

    const list = UNSAFE_getByType(VirtualizedList);

    await act(async () => {
      await list.props.onRefresh();
    });
    expect(refetch).toHaveBeenCalled();

    act(() => {
      list.props.onEndReached();
    });
    expect(fetchNextPage).toHaveBeenCalled();

    expect(list.props.ListFooterComponent).toBeNull();
  });

  it('shows loading skeleton when bookmarks are fetching', () => {
    mockUseBookmarks.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<BookmarksScreen />);
    expect(getByText('loading 4')).toBeTruthy();
  });

  it('renders error state when fetching fails', () => {
    mockUseBookmarks.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<BookmarksScreen />);
    expect(getByText('bookmarks.error')).toBeTruthy();
  });

  it('renders empty state when there are no bookmarks', () => {
    mockUseBookmarks.mockReturnValue({
      data: { pages: [{ bookmarks: [] }] },
      isLoading: false,
      error: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<BookmarksScreen />);
    expect(getByText('bookmarks.emptyState')).toBeTruthy();
  });

  it('shows loading footer while fetching additional pages', () => {
    mockUseBookmarks.mockReturnValue({
      data: { pages: [{ bookmarks: [buildBookmark()] }] },
      isLoading: false,
      error: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { UNSAFE_getByType } = render(<BookmarksScreen />);
    const list = UNSAFE_getByType(VirtualizedList);
    const footer = list.props.ListFooterComponent;

    if (typeof footer === 'function') {
      const renderedFooter = footer();
      expect(renderedFooter.props.children.props.children).toBe('feed.loadingMorePosts');
    } else {
      expect(footer?.props.children.props.children).toBe('feed.loadingMorePosts');
    }
  });
});
