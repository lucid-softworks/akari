import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { CustomTabBar } from '@/components/CustomTabBar';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 8, left: 0 }),
}));

jest.mock('@/components/HapticTab', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  const MockHapticTab = ({
    children,
    onPress,
    onLongPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    style,
  }: any) => (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      onPress={onPress}
      onLongPress={onLongPress}
      style={typeof style === 'function' ? style({ pressed: false, hovered: false, focused: false }) : style}
    >
      {children}
    </Pressable>
  );
  return { HapticTab: MockHapticTab };
});

jest.mock('@/components/TabBadge', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { TabBadge: jest.fn(({ count }: { count: number }) => <Text>badge{count}</Text>) };
});

jest.mock('@/components/ui/IconSymbol', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text> };
});

jest.mock('@/hooks/useBorderColor', () => ({ useBorderColor: () => '#222' }));
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: (values: { light?: string; dark?: string }) => values.light ?? values.dark ?? '#000',
}));

jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: {
    handleTabPress: jest.fn(),
  },
}));

const mockTabBadge = require('@/components/TabBadge').TabBadge as jest.Mock;
const mockHandleTabPress = tabScrollRegistry.handleTabPress as jest.Mock;

const createTabBar = (overrideProps: Partial<React.ComponentProps<typeof CustomTabBar>> = {}) => {
  const routes = [
    { key: 'index', name: 'index' },
    { key: 'search', name: 'search' },
    { key: 'messages', name: 'messages' },
    { key: 'notifications', name: 'notifications' },
    { key: 'profile', name: 'profile' },
    { key: 'settings', name: 'settings' },
  ];

  const navigation = {
    emit: jest.fn(),
    navigate: jest.fn(),
  } as any;

  const props: React.ComponentProps<typeof CustomTabBar> = {
    state: {
      index: 0,
      routes,
    } as any,
    navigation,
    descriptors: {},
    unreadMessagesCount: 4,
    unreadNotificationsCount: 6,
    onProfileLongPress: jest.fn(),
    ...overrideProps,
  };

  const rendered = render(<CustomTabBar {...props} />);

  return { rendered, props, navigation };
};

describe('CustomTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders each tab with the expected icon and badges', () => {
    const {
      rendered: { getByA11yLabel },
    } = createTabBar();

    expect(getByA11yLabel('Home')).toBeTruthy();
    expect(getByA11yLabel('Search')).toBeTruthy();
    expect(getByA11yLabel('Messages')).toBeTruthy();
    expect(getByA11yLabel('Notifications')).toBeTruthy();
    expect(getByA11yLabel('Profile')).toBeTruthy();
    expect(getByA11yLabel('Settings')).toBeTruthy();
    const badgeCounts = mockTabBadge.mock.calls.map((call: any[]) => call[0].count);
    expect(badgeCounts).toContain(4);
    expect(badgeCounts).toContain(6);
  });

  it('navigates to the selected tab when pressed', () => {
    const { rendered, navigation } = createTabBar();

    fireEvent.press(rendered.getByA11yLabel('Search'));

    expect(navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ canPreventDefault: true, target: 'search', type: 'tabPress' }),
    );
    expect(navigation.navigate).toHaveBeenCalledWith('search');
  });

  it('invokes the scroll registry when the active tab is pressed twice', () => {
    const {
      rendered,
      navigation,
      props: { state },
    } = createTabBar();

    navigation.emit.mockImplementation(() => ({ defaultPrevented: false }));

    fireEvent.press(rendered.getByA11yLabel('Home'));
    fireEvent.press(rendered.getByA11yLabel('Home'));

    expect(mockHandleTabPress).toHaveBeenCalledWith('index');
    expect(navigation.navigate).not.toHaveBeenCalled();

    state.index = 1;
    fireEvent.press(rendered.getByA11yLabel('Home'));
    expect(mockHandleTabPress).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('index');
  });

  it('opens the account switcher when the profile tab is long pressed', () => {
    const onProfileLongPress = jest.fn();
    const { rendered, navigation } = createTabBar({ onProfileLongPress });

    fireEvent(rendered.getByA11yLabel('Profile'), 'onLongPress');

    expect(navigation.emit).toHaveBeenCalledWith({ target: 'profile', type: 'tabLongPress' });
    expect(onProfileLongPress).toHaveBeenCalled();
  });
});

