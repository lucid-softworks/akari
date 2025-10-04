import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { VideosTab } from '@/components/profile/VideosTab';
import { useAuthorVideos } from '@/hooks/queries/useAuthorVideos';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useTabNavigation } from '@/hooks/useTabNavigation';
import { VirtualizedList } from '@/components/ui/VirtualizedList';

jest.mock('@/hooks/queries/useAuthorVideos');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useTabNavigation');
jest.mock('@shopify/flash-list', () => require('../../../test-utils/flash-list'));

let mockPostCard: jest.Mock;
jest.mock('@/components/PostCard', () => {
  mockPostCard = jest.fn(({ post, onPress }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text onPress={onPress}>{post.id}</Text>;
  });
  return { PostCard: mockPostCard };
});

jest.mock('@/components/skeletons', () => ({
  FeedSkeleton: jest.fn(() => null),
}));

type Video = {
  uri: string;
  record?: { text?: string };
  author: { handle: string; displayName?: string; avatar?: string };
  indexedAt: string;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  embed?: any;
  embeds?: any[];
  labels?: any;
  viewer?: any;
  cid: string;
};

describe('VideosTab', () => {
  const mockUseAuthorVideos = useAuthorVideos as jest.Mock;
  const mockUseThemeColor = useThemeColor as jest.Mock;
  const mockUseTranslation = useTranslation as jest.Mock;
  const mockUseTabNavigation = useTabNavigation as jest.Mock;
  let openPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
    openPost = jest.fn();
    mockUseTabNavigation.mockReturnValue({ openPost, openProfile: jest.fn(), activeTab: 'index' });
  });

  it('renders FeedSkeleton while loading', () => {
    mockUseAuthorVideos.mockReturnValue({
      data: undefined,
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<VideosTab handle="alice" />);

    const { FeedSkeleton } = require('@/components/skeletons');
    expect(FeedSkeleton).toHaveBeenCalled();
  });

  it('shows empty state when no videos', () => {
    mockUseAuthorVideos.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<VideosTab handle="alice" />);
    expect(getByText('profile.noVideos')).toBeTruthy();
  });

  it('renders videos and navigates on press', () => {
    const video: Video = {
      uri: 'at://video/1',
      record: { text: 'Video 1' },
      author: { handle: 'alice', displayName: 'Alice' },
      indexedAt: '2024-01-01',
      cid: 'cid1',
    };

    mockUseAuthorVideos.mockReturnValue({
      data: [video],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<VideosTab handle="alice" />);
    fireEvent.press(getByText('at://video/1'));
    expect(openPost).toHaveBeenCalledWith('at://video/1');
  });

  it('fetches next page on end reached', () => {
    const video: Video = {
      uri: 'at://video/1',
      author: { handle: 'alice' },
      indexedAt: '2024-01-01',
      cid: 'cid1',
    };

    const fetchNextPage = jest.fn();
    mockUseAuthorVideos.mockReturnValue({
      data: [video],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { UNSAFE_getByType } = render(<VideosTab handle="alice" />);
    const list = UNSAFE_getByType(VirtualizedList);
    act(() => {
      list.props.onEndReached();
    });
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer when fetching next page', () => {
    const video: Video = {
      uri: 'at://video/1',
      author: { handle: 'alice' },
      indexedAt: '2024-01-01',
      cid: 'cid1',
    };

    mockUseAuthorVideos.mockReturnValue({
      data: [video],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByText } = render(<VideosTab handle="alice" />);
    expect(getByText('common.loading')).toBeTruthy();
  });

  it('does not fetch when no more videos', () => {
    const video: Video = {
      uri: 'at://video/1',
      author: { handle: 'alice' },
      indexedAt: '2024-01-01',
      cid: 'cid1',
    };
    const fetchNextPage = jest.fn();
    mockUseAuthorVideos.mockReturnValue({
      data: [video],
      isLoading: false,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { UNSAFE_getByType } = render(<VideosTab handle="alice" />);
    const list = UNSAFE_getByType(VirtualizedList);
    act(() => {
      list.props.onEndReached();
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('formats reply data and handles missing parent handle', () => {
    const videos: Video[] = [
      {
        uri: 'at://video/1',
        record: { text: 'child1' },
        author: { handle: 'alice' },
        indexedAt: '2024-01-01',
        cid: 'c1',
        reply: {
          parent: {
            author: { handle: 'bob', displayName: 'Bob' },
            record: { text: 'parent1' },
          },
        },
      } as any,
      {
        uri: 'at://video/2',
        record: { text: 'child2' },
        author: { handle: 'carol' },
        indexedAt: '2024-01-02',
        cid: 'c2',
        reply: {
          parent: {
            author: { displayName: 'Anon' },
            record: { text: 'parent2' },
          },
        },
      } as any,
    ];

    mockUseAuthorVideos.mockReturnValue({
      data: videos,
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<VideosTab handle="alice" />);
    expect(mockPostCard).toHaveBeenCalledTimes(2);
    const first = mockPostCard.mock.calls[0][0].post.replyTo;
    const second = mockPostCard.mock.calls[1][0].post.replyTo;
    expect(first).toEqual({
      author: { handle: 'bob', displayName: 'Bob' },
      text: 'parent1',
    });
    expect(second).toEqual({
      author: { handle: 'unknown', displayName: 'Anon' },
      text: 'parent2',
    });
  });
});

