import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import RootLayout from '@/app/_layout';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Platform } from 'react-native';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    ThemeProvider: jest.fn(
      ({ children }: { value: unknown; children: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children),
    ),
  };
});

jest.mock('expo-font');
const mockUseFonts = useFonts as unknown as jest.Mock;

jest.mock('@/hooks/useColorScheme');
const mockUseColorScheme = useColorScheme as unknown as jest.Mock;

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return { GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});

jest.mock('@tanstack/react-query-devtools', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ReactQueryDevtools: () => <Text>Devtools</Text> };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');

  const EdgeInsetsContext = React.createContext({ top: 0, right: 0, bottom: 0, left: 0 });
  const FrameContext = React.createContext({ x: 0, y: 0, width: 0, height: 0 });

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SafeAreaInsetsContext: EdgeInsetsContext,
    SafeAreaFrameContext: FrameContext,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    initialWindowMetrics: null,
  };
});

jest.mock('@/contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const Screen = jest.fn(() => null);
  const Stack = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  // @ts-ignore
  Stack.Screen = Screen;
  return { Stack };
});

const setPlatform = (os: string) => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
  });
};

const mockThemeProvider = ThemeProvider as unknown as jest.Mock;

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
    setPlatform('ios');
    mockThemeProvider.mockClear();
  });

  it('returns null when fonts are not loaded', () => {
    mockUseFonts.mockReturnValue([false]);
    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeNull();
  });

  it('renders stack screens without devtools on native platforms', async () => {
    mockUseFonts.mockReturnValue([true]);
    const { queryByText } = render(<RootLayout />);

    await waitFor(() => {
      expect(mockThemeProvider).toHaveBeenCalled();
    });

    expect(queryByText('Devtools')).toBeNull();
    const { Stack } = require('expo-router');
    await waitFor(() => {
      expect(Stack.Screen).toHaveBeenCalledTimes(4);
    });
    const names: string[] = [];
    for (const call of Stack.Screen.mock.calls) {
      names.push(call[0].name);
    }
    expect(names).toEqual(['(auth)', '(home,search,notifications,messages,post,profile)', 'debug', '+not-found']);
    const themeProps = mockThemeProvider.mock.calls[0][0];
    expect(themeProps.value).toBe(DefaultTheme);
  });

  it('renders devtools on web', async () => {
    mockUseFonts.mockReturnValue([true]);
    setPlatform('web');
    const { findByText } = render(<RootLayout />);
    expect(await findByText('Devtools')).toBeTruthy();
  });

  it('uses the dark theme when the color scheme is dark', async () => {
    mockUseFonts.mockReturnValue([true]);
    mockUseColorScheme.mockReturnValue('dark');

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockThemeProvider).toHaveBeenCalled();
    });
    const themeProps = mockThemeProvider.mock.calls[0][0];
    expect(themeProps.value).toBe(DarkTheme);
  });
});

