import { act, render } from '@testing-library/react-native';
import React from 'react';
import TabLayout from '@/app/(tabs)/_layout';
import { ActivityIndicator } from 'react-native';

import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

const navigationListeners: Record<string, (event: any) => void> = {};
const createNavigationState = () => ({
  index: 0,
  routes: [
    { key: 'index-key', name: 'index' },
    { key: 'search-key', name: 'search' },
    { key: 'messages-key', name: 'messages' },
    { key: 'notifications-key', name: 'notifications' },
    { key: 'bookmarks-key', name: 'bookmarks' },
    { key: 'post-key', name: 'post' },
    { key: 'profile-key', name: 'profile' },
    { key: 'settings-key', name: 'settings' },
  ],
});
let navigationState = createNavigationState();

const addListenerMock = jest.fn((type: string, handler: (event: any) => void) => {
  navigationListeners[type] = handler;
  return () => {
    delete navigationListeners[type];
  };
});

const getStateMock = jest.fn(() => navigationState);

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Tabs = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);
  const Screen = jest.fn(() => null);
  Tabs.Screen = Screen;
  const Redirect = ({ href }: { href: string }) => <Text>redirect:{href}</Text>;
  const useNavigation = jest.fn(() => ({
    addListener: addListenerMock,
    getState: getStateMock,
  }));
  return { Tabs, Redirect, useNavigation };
});

const NativeTabsMock = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);
const TriggerMock = jest.fn(({ children }: { children?: React.ReactNode }) => <>{children}</>);
(TriggerMock as any).TabBar = jest.fn(() => null);
(NativeTabsMock as any).Trigger = TriggerMock;
const IconMock = jest.fn(() => null);
const LabelMock = jest.fn(({ children }: { children?: React.ReactNode }) => <>{children}</>);
const BadgeMock = jest.fn(({ children, hidden }: { children?: React.ReactNode; hidden?: boolean }) =>
  hidden ? null : <>{children}</>,
);
const VectorIconMock = jest.fn(() => null);

jest.mock('expo-router/unstable-native-tabs', () => ({
  NativeTabs: NativeTabsMock,
  Icon: IconMock,
  Label: LabelMock,
  Badge: BadgeMock,
  VectorIcon: VectorIconMock,
}));

jest.mock('@/hooks/queries/useAuthStatus');
jest.mock('@/hooks/queries/useUnreadMessagesCount');
jest.mock('@/hooks/queries/useUnreadNotificationsCount');
jest.mock('@/hooks/useResponsive');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/usePushNotifications');

jest.mock('@/components/AccountSwitcherSheet', () => {
  const React = require('react');
  return { AccountSwitcherSheet: jest.fn(() => null) };
});

jest.mock('@/components/Sidebar', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Sidebar: () => <Text>Sidebar</Text> };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: {
    handleTabPress: jest.fn(),
  },
}));

const mockUseAuthStatus = useAuthStatus as jest.Mock;
const mockUseUnreadMessagesCount = useUnreadMessagesCount as jest.Mock;
const mockUseUnreadNotificationsCount = useUnreadNotificationsCount as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockHandleTabPress = tabScrollRegistry.handleTabPress as jest.Mock;

const { AccountSwitcherSheet } = require('@/components/AccountSwitcherSheet');
const mockAccountSwitcherSheet = AccountSwitcherSheet as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  navigationState = createNavigationState();
  Object.keys(navigationListeners).forEach((event) => delete navigationListeners[event]);
  mockUseUnreadMessagesCount.mockReturnValue({ data: 0 });
  mockUseUnreadNotificationsCount.mockReturnValue({ data: 0 });
  mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  mockUseThemeColor.mockImplementation(
    (props: { light?: string; dark?: string }) => props?.light ?? props?.dark ?? '#000',
  );
  mockAccountSwitcherSheet.mockClear();
});

describe('TabLayout', () => {
  it('shows loading indicator while auth status is loading', () => {
    mockUseAuthStatus.mockReturnValue({ data: null, isLoading: true });
    const { UNSAFE_getByType } = render(<TabLayout />);
    const indicator = UNSAFE_getByType(ActivityIndicator);
    expect(indicator).toBeTruthy();
    expect(indicator.props.color).toBe('#7C8CF9');
  });

  it('redirects to signin when not authenticated', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: false }, isLoading: false });
    const { getByText } = render(<TabLayout />);
    expect(getByText('redirect:/(auth)/signin')).toBeTruthy();
  });

  it('renders large screen layout with sidebar', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseResponsive.mockReturnValue({ isLargeScreen: true });
    const { getByText } = render(<TabLayout />);
    expect(getByText('Sidebar')).toBeTruthy();
    const { Tabs } = require('expo-router');
    expect(Tabs.mock.calls[0][0].screenOptions).toEqual({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
    const names = (require('expo-router').Tabs.Screen as jest.Mock).mock.calls.map((c: any[]) => c[0].name);
    expect(names).toEqual([
      'index',
      'search',
      'messages',
      'notifications',
      'bookmarks',
      'post',
      'profile',
      'settings',
    ]);
  });

  it('renders mobile tabs with badges', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseUnreadMessagesCount.mockReturnValue({ data: 2 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 3 });

    render(<TabLayout />);

    const triggerCalls = (TriggerMock as jest.Mock).mock.calls.map((call) => call[0]);
    expect(triggerCalls.map((props) => props.name)).toEqual([
      'index',
      'search',
      'messages',
      'notifications',
      'bookmarks',
      'post',
      'profile',
      'settings',
    ]);
    expect(triggerCalls[4]).toMatchObject({ hidden: true, options: { href: null } });
    expect(triggerCalls[5]).toMatchObject({ hidden: true, options: { href: null } });

    const badgeCalls = (BadgeMock as jest.Mock).mock.calls;
    expect(badgeCalls).toHaveLength(2);
    expect(badgeCalls[0][0]).toMatchObject({ hidden: false, children: '2' });
    expect(badgeCalls[1][0]).toMatchObject({ hidden: false, children: '3' });

    const nativeTabsProps = (NativeTabsMock as jest.Mock).mock.calls[0][0];
    expect(nativeTabsProps.tintColor).toBe('#7C8CF9');
    expect(nativeTabsProps.iconColor).toBe('#6B7280');
    expect(nativeTabsProps.backgroundColor).toBe('#F3F4F6');
  });

  it('uses default tint and hides badges when counts are unavailable', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    mockUseUnreadMessagesCount.mockReturnValue({});
    mockUseUnreadNotificationsCount.mockReturnValue({});

    render(<TabLayout />);

    const badgeCalls = (BadgeMock as jest.Mock).mock.calls;
    expect(badgeCalls).toHaveLength(2);
    expect(badgeCalls[0][0]).toMatchObject({ hidden: true });
    expect(badgeCalls[1][0]).toMatchObject({ hidden: true });
  });

  it('opens the account switcher when the profile tab is long pressed', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);

    expect(navigationListeners.tabLongPress).toBeDefined();
    const preventDefault = jest.fn();

    act(() => {
      navigationListeners.tabLongPress?.({ target: 'profile-key', preventDefault } as any);
    });

    expect(preventDefault).toHaveBeenCalled();
    const latestCall = mockAccountSwitcherSheet.mock.calls.at(-1);
    expect(latestCall?.[0].visible).toBe(true);

    act(() => {
      latestCall?.[0].onClose();
    });

    const closeCall = mockAccountSwitcherSheet.mock.calls.at(-1);
    expect(closeCall?.[0].visible).toBe(false);
  });

  it('triggers scroll handlers when the active tab is pressed again', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);

    navigationState.index = 2; // messages

    act(() => {
      navigationListeners.tabPress?.({ target: 'messages-key' } as any);
    });

    expect(mockHandleTabPress).toHaveBeenCalledTimes(1);
    expect(mockHandleTabPress).toHaveBeenCalledWith('messages');
  });

  it('ignores tab presses when a different tab is focused', () => {
    mockUseAuthStatus.mockReturnValue({ data: { isAuthenticated: true }, isLoading: false });
    render(<TabLayout />);

    navigationState.index = 0; // index focused

    act(() => {
      navigationListeners.tabPress?.({ target: 'messages-key' } as any);
    });

    expect(mockHandleTabPress).not.toHaveBeenCalled();
  });
});
