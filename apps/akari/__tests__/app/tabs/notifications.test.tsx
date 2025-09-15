import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

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

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseThemeColor.mockImplementation((c: any) => (typeof c === 'string' ? c : c.light ?? '#000'));
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
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
                author: { did: 'd1', handle: 'alice', displayName: 'Alice', avatar: '' },
                reason: 'like',
                reasonSubject: 'post1',
                isRead: false,
                indexedAt: now,
                postContent: 'post',
                embed: undefined,
              },
              {
                id: '2',
                author: { did: 'd2', handle: 'bob', displayName: 'Bob', avatar: '' },
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
    expect(getByText('Alice and Bob')).toBeTruthy();
    expect(getByText('notifications.andOneOther')).toBeTruthy();
    expect(getByText('Carol')).toBeTruthy();
    expect(getByText('notifications.startedFollowingYou')).toBeTruthy();

    fireEvent.press(getByText('notifications.andOneOther'));
    expect(mockRouterPush).toHaveBeenCalledWith('/post/post1');

    fireEvent.press(getByText('notifications.startedFollowingYou'));
    expect(mockRouterPush).toHaveBeenCalledWith('/profile/carol');
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
});

