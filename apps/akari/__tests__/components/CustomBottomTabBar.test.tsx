import { fireEvent, render } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Text } from 'react-native';

import { CustomBottomTabBar } from '@/components/CustomBottomTabBar';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');

jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text: RNText } = require('react-native');
  return { ThemedText: ({ children, ...props }: any) => <RNText {...props}>{children}</RNText> };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/ui/TabBarBackground', () => ({
  __esModule: true,
  default: () => null,
  useBottomTabOverflow: jest.fn(() => 0),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: {
    handleTabPress: jest.fn(),
  },
}));

type PartialProps = Partial<BottomTabBarProps>;

type RouteConfig = {
  key: string;
  name: string;
};

const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockHandleTabPress = tabScrollRegistry.handleTabPress as jest.Mock;

const BASE_ROUTES: RouteConfig[] = [
  { key: 'home', name: 'index' },
  { key: 'search', name: 'search' },
  { key: 'messages', name: 'messages' },
  { key: 'notifications', name: 'notifications' },
  { key: 'profile', name: 'profile' },
  { key: 'settings', name: 'settings' },
];

const buildDescriptors = (routes: RouteConfig[]) =>
  routes.reduce<Record<string, BottomTabBarProps['descriptors'][string]>>((acc, route) => {
    acc[route.key] = {
      key: route.key,
      name: route.name,
      options: {
        tabBarIcon: jest.fn(() => <Text>{route.name}</Text>),
      },
    } as BottomTabBarProps['descriptors'][string];

    return acc;
  }, {});

const createProps = (partial: PartialProps = {}) => {
  const routes = BASE_ROUTES.map((route) => ({
    key: route.key,
    name: route.name,
  }));

  const state: BottomTabBarProps['state'] = {
    index: 0,
    key: 'tabs',
    routeNames: routes.map((route) => route.name),
    type: 'tab',
    stale: false,
    history: [],
    routes,
  };

  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  } as unknown as BottomTabBarProps['navigation'];

  const baseProps: BottomTabBarProps = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    state,
    navigation,
    descriptors: buildDescriptors(BASE_ROUTES),
  };

  return {
    ...baseProps,
    ...partial,
    state: partial.state ?? state,
    navigation: partial.navigation ?? navigation,
    descriptors: partial.descriptors ?? baseProps.descriptors,
  } satisfies BottomTabBarProps;
};

const renderBar = (partialProps: PartialProps = {}) => {
  const props = createProps(partialProps);
  const view = render(
    <NavigationContainer independent>
      <CustomBottomTabBar {...props} />
    </NavigationContainer>,
  );

  return {
    ...view,
    navigation: props.navigation as { emit: jest.Mock; navigate: jest.Mock },
    state: props.state,
    rerenderBar: (nextProps: PartialProps = {}) => {
      const newProps = createProps({ ...partialProps, ...nextProps });
      view.rerender(<CustomBottomTabBar {...newProps} />);
      return newProps;
    },
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBorderColor.mockReturnValue('#111');
  mockUseThemeColor.mockImplementation(
    (palette: { light?: string; dark?: string }) => palette.light ?? palette.dark ?? '#000',
  );
});

describe('CustomBottomTabBar', () => {
  it('invokes the scroll registry when the active tab is reselected', () => {
    const { getByLabelText, navigation } = renderBar();

    fireEvent.press(getByLabelText('Home'));

    expect(navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'home' }),
    );
    expect(mockHandleTabPress).toHaveBeenCalledTimes(1);
    expect(mockHandleTabPress).toHaveBeenCalledWith('index');
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
  
  it('navigates to an inactive tab without triggering scroll', () => {
    const { getByLabelText, navigation } = renderBar();

    fireEvent.press(getByLabelText('Search'));

    expect(navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'search' }),
    );
    expect(navigation.navigate).toHaveBeenCalledWith('search', undefined);
    expect(mockHandleTabPress).not.toHaveBeenCalled();
  });

  it('skips navigation when the press event is prevented', () => {
    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented: true })),
      navigate: jest.fn(),
    } as unknown as BottomTabBarProps['navigation'];

    const { getByLabelText } = renderBar({ navigation });

    fireEvent.press(getByLabelText('Search'));

    expect(navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'search' }),
    );
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockHandleTabPress).not.toHaveBeenCalled();
  });
});
