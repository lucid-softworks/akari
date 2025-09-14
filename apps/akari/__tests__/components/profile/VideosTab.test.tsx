import { act, fireEvent, render } from '@testing-library/react-native';
import { FlatList, Text } from 'react-native';

import { VideosTab } from '@/components/profile/VideosTab';
import { useAuthorVideos } from '@/hooks/queries/useAuthorVideos';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { router } from 'expo-router';

jest.mock('@/hooks/queries/useAuthorVideos');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@/components/PostCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PostCard: ({ post, onPress }: any) => (
      <Text onPress={onPress}>{post.id}</Text>
    ),
  };
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
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
    expect(router.push).toHaveBeenCalledWith('/post/' + encodeURIComponent('at://video/1'));
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
    const list = UNSAFE_getByType(FlatList);
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
});

