import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { RepliesTab } from '@/components/profile/RepliesTab';
import { useAuthorReplies } from '@/hooks/queries/useAuthorReplies';
import { useTranslation } from '@/hooks/useTranslation';
import { router } from 'expo-router';

jest.mock('@/hooks/queries/useAuthorReplies');
jest.mock('@/hooks/useTranslation');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/components/PostCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    PostCard: ({ post, onPress }: { post: any; onPress: () => void }) => (
      <Pressable onPress={onPress} accessibilityRole="button">
        <Text>{post.text}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/skeletons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FeedSkeleton: () => <Text>FeedSkeleton</Text>,
  };
});

const mockUseAuthorReplies = useAuthorReplies as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockPush = router.push as jest.Mock;

describe('RepliesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  });

  it('renders skeleton while loading', () => {
    mockUseAuthorReplies.mockReturnValue({
      data: [],
      isLoading: true,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<RepliesTab handle="alice" />);
    expect(getByText('FeedSkeleton')).toBeTruthy();
  });

  it('shows message when no replies exist', () => {
    mockUseAuthorReplies.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<RepliesTab handle="alice" />);
    expect(getByText('profile.noReplies')).toBeTruthy();
  });

  it('renders replies and navigates on press', () => {
    const reply = {
      uri: 'at://did:plc:test/app.bsky.feed.post/1',
      record: { text: 'Hello world' },
      author: { handle: 'user', displayName: 'User', avatar: '' },
      indexedAt: '2024-01-01T00:00:00.000Z',
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
    };
    mockUseAuthorReplies.mockReturnValue({
      data: [reply],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { getByText } = render(<RepliesTab handle="alice" />);
    fireEvent.press(getByText('Hello world'));
    expect(mockPush).toHaveBeenCalledWith(`/post/${encodeURIComponent(reply.uri)}`);
  });

  it('fetches more replies on end reached', () => {
    const fetchNextPage = jest.fn();
    mockUseAuthorReplies.mockReturnValue({
      data: [
        {
          uri: 'at://did:plc:test/app.bsky.feed.post/1',
          record: { text: 'Hello world' },
          author: { handle: 'user', displayName: 'User', avatar: '' },
          indexedAt: '2024-01-01T00:00:00.000Z',
          likeCount: 0,
          replyCount: 0,
          repostCount: 0,
        },
      ],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { getByRole } = render(<RepliesTab handle="alice" />);
    fireEvent(getByRole('list'), 'onEndReached');
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('shows loading footer while fetching next page', () => {
    const fetchNextPage = jest.fn();
    mockUseAuthorReplies.mockReturnValue({
      data: [
        {
          uri: 'at://did:plc:test/app.bsky.feed.post/1',
          record: { text: 'Hello world' },
          author: { handle: 'user', displayName: 'User', avatar: '' },
          indexedAt: '2024-01-01T00:00:00.000Z',
          likeCount: 0,
          replyCount: 0,
          repostCount: 0,
        },
      ],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    const { getByRole, getByText } = render(<RepliesTab handle="alice" />);
    expect(getByText('common.loading')).toBeTruthy();
    fireEvent(getByRole('list'), 'onEndReached');
    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});

