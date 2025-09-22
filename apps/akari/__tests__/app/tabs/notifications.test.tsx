import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import NotificationsScreen from '@/app/(tabs)/notifications';
import { router } from 'expo-router';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useResponsive } from '@/hooks/useResponsive';

jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { NotificationSkeleton: () => <Text>Skeleton</Text> };
});

jest.mock('@/components/ui/IconSymbol', () => {
  const { Text } = require('react-native');
  return { IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text> };
});

jest.mock('@/hooks/queries/useNotifications');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useResponsive');
jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: { register: jest.fn() },
}));

const mockUseNotifications = useNotifications as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockRouterPush = router.push as jest.Mock;
const mockRegister = tabScrollRegistry.register as jest.Mock;
let tMock: jest.Mock;

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseThemeColor.mockImplementation((c: any) => (typeof c === 'string' ? c : c.light ?? '#000'));
    tMock = jest.fn((key: string) => key);
    mockUseTranslation.mockReturnValue({ t: tMock });
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  });

  it('renders notifications and navigates on press', () => {
    const now = new Date().toISOString();
    mockUseNotifications.mockReturnValue({
      data: {
        pages: [
          {
            notifications: [
              {
                id: '1',
                author: { did: 'd1', handle: 'alice', displayName: '', avatar: '' },
                reason: 'like',
                reasonSubject: 'post1',
                isRead: false,
                indexedAt: now,
                postContent: 'post',
                embed: undefined,
              },
              {
                id: '2',
                author: { did: 'd2', handle: 'bob', displayName: '', avatar: '' },
                reason: 'like',
                reasonSubject: 'post1',
                isRead: false,
                indexedAt: now,
                postContent: 'post',
                embed: undefined,
              },
              {
                id: '3',
                author: { did: 'd3', handle: 'carol', displayName: 'Carol', avatar: '' },
                reason: 'follow',
                isRead: false,
                indexedAt: now,
              },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(mockRegister).toHaveBeenCalledWith('notifications', expect.any(Function));
    expect(getByText('alice and bob')).toBeTruthy();
    expect(getByText('notifications.andOneOther')).toBeTruthy();
    expect(getByText('Carol')).toBeTruthy();
    expect(getByText('notifications.startedFollowingYou')).toBeTruthy();

    fireEvent.press(getByText('notifications.andOneOther'));
    expect(mockRouterPush).toHaveBeenCalledWith('/post/post1');

    fireEvent.press(getByText('notifications.startedFollowingYou'));
    expect(mockRouterPush).toHaveBeenCalledWith('/profile/carol');
  });

  it('renders grouped notifications with embed images and overflow avatars', () => {
    mockUseResponsive.mockReturnValueOnce({ isLargeScreen: true });
    const fetchNextPage = jest.fn();
    const baseTime = Date.now();
    const embed = {
      $type: 'app.bsky.embed.images#view',
      images: [
        {
          alt: 'first',
          thumb: 'https://example.com/thumb1.jpg',
          fullsize: 'https://example.com/full1.jpg',
        },
        {
          alt: 'second',
          thumb: 'https://example.com/thumb2.jpg',
          fullsize: 'https://example.com/full2.jpg',
        },
      ],
    };

    const authors = [
      { did: 'd1', handle: 'alice', displayName: '', avatar: 'https://example.com/a.jpg' },
      { did: 'd2', handle: 'bob', displayName: '', avatar: '' },
      { did: 'd3', handle: 'carol', displayName: 'Carol', avatar: 'https://example.com/c.jpg' },
      { did: 'd4', handle: 'dan', displayName: 'Dan', avatar: '' },
      { did: 'd5', handle: 'erin', displayName: 'Erin', avatar: '' },
    ];

    const likeNotifications = authors.map((author, index) => ({
      id: `like-${index}`,
      author,
      reason: 'like',
      reasonSubject: 'post-embed',
      isRead: index !== 1,
      indexedAt: new Date(baseTime + index * 1000).toISOString(),
      postContent: 'Grouped content',
      embed: index === 0 ? embed : undefined,
    }));

    likeNotifications.push({
      id: 'like-duplicate',
      author: authors[0],
      reason: 'like',
      reasonSubject: 'post-embed',
      isRead: true,
      indexedAt: new Date(baseTime + 6000).toISOString(),
      postContent: 'Grouped content',
      embed: undefined,
    });

    const replyNotification = {
      id: 'reply-1',
      author: { did: 'd6', handle: 'replyUser', displayName: 'Reply User', avatar: '' },
      reason: 'reply',
      reasonSubject: 'post-reply',
      isRead: false,
      indexedAt: new Date(baseTime + 7000).toISOString(),
      postContent: 'Reply content',
      embed: undefined,
    };

    const unknownNotification = {
      id: 'unknown-1',
      author: { did: 'd7', handle: 'mystery', displayName: '', avatar: '' },
      reason: 'unknown',
      isRead: true,
      indexedAt: new Date(baseTime + 8000).toISOString(),
      postContent: undefined,
      embed: undefined,
    };

    const repostNotification = {
      id: 'repost-1',
      author: { did: 'd8', handle: 'reposter', displayName: 'Reposter', avatar: '' },
      reason: 'repost',
      reasonSubject: undefined,
      isRead: false,
      indexedAt: new Date(baseTime + 9000).toISOString(),
      postContent: 'Repost content',
      embed: undefined,
    };

    const quoteNotification = {
      id: '',
      author: { did: 'd9', handle: 'quoter', displayName: 'Quoter', avatar: '' },
      reason: 'quote',
      reasonSubject: 'post-quote',
      isRead: false,
      indexedAt: new Date(baseTime + 10000).toISOString(),
      postContent: 'Quote content',
      embed: undefined,
    };

    mockUseNotifications.mockReturnValue({
      data: {
        pages: [
          {
            notifications: [
              ...likeNotifications,
              replyNotification,
              unknownNotification,
              repostNotification,
              quoteNotification,
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: true,
      fetchNextPage,
      isFetchingNextPage: true,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText, UNSAFE_getAllByType, UNSAFE_getByType } = render(<NotificationsScreen />);

    expect(getByText('alice and 4 others')).toBeTruthy();
    expect(getByText('notifications.andOthers')).toBeTruthy();
    expect(getByText('+1')).toBeTruthy();
    expect(getByText('Reply to you')).toBeTruthy();
    expect(getByText('unknown')).toBeTruthy();
    expect(getByText('notifications.repostedYourPost')).toBeTruthy();
    expect(getByText('notifications.quotedYourPost')).toBeTruthy();
    expect(getByText('arrow.2.squarepath')).toBeTruthy();
    expect(getByText('quote.bubble')).toBeTruthy();
    expect(getByText('notifications.loadingMoreNotifications')).toBeTruthy();

    const flashList = UNSAFE_getByType(FlashList);
    const styleArray = Array.isArray(flashList.props.style) ? flashList.props.style : [flashList.props.style];
    expect(styleArray[1]).toEqual(expect.objectContaining({ paddingTop: 0 }));

    const images = UNSAFE_getAllByType(Image);
    expect(images.some((img) => img.props.source?.uri === 'https://example.com/full1.jpg')).toBe(true);

    const andOthersCall = tMock.mock.calls.find(([key]) => key === 'notifications.andOthers');
    expect(andOthersCall?.[1]).toMatchObject({ count: 4, action: 'notifications.likedYourPost' });

    const scrollCallback = mockRegister.mock.calls[0][1];
    expect(scrollCallback).toEqual(expect.any(Function));
    act(() => {
      scrollCallback();
    });
  });

  it('shows empty state', () => {
    mockUseNotifications.mockReturnValue({
      data: { pages: [{ notifications: [] }] },
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(getByText('notifications.noNotificationsYet')).toBeTruthy();
    expect(getByText('notifications.notificationsWillAppearHere')).toBeTruthy();
  });

  it('shows error state', () => {
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: 'oops' },
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(getByText('notifications.errorLoadingNotifications')).toBeTruthy();
    expect(getByText('oops')).toBeTruthy();
  });

  it('falls back to default error message when no error detail is provided', () => {
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: {},
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<NotificationsScreen />);

    expect(getByText('notifications.errorLoadingNotifications')).toBeTruthy();
    expect(getByText('notifications.somethingWentWrong')).toBeTruthy();
  });

  it('renders loading skeletons while data is loading', () => {
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getAllByText } = render(<NotificationsScreen />);

    expect(getAllByText('Skeleton')).toHaveLength(12);
  });

  it('navigates to profile when notification subject is missing', () => {
    const now = new Date().toISOString();
    mockUseNotifications.mockReturnValue({
      data: {
        pages: [
          {
            notifications: [
              {
                id: 'subjectless',
                author: { did: 'd8', handle: 'no-subject', displayName: 'No Subject', avatar: '' },
                reason: 'mention',
                isRead: false,
                indexedAt: now,
              },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<NotificationsScreen />);

    fireEvent.press(getByText('notifications.mentionedYou'));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/profile/no-subject');
  });
});

