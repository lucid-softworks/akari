import { render } from '@testing-library/react-native';
import React from 'react';
import RootLayout from '@/app/_layout';
import { useFonts } from 'expo-font';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Platform } from 'react-native';

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

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
    setPlatform('ios');
  });

  it('returns null when fonts are not loaded', () => {
    mockUseFonts.mockReturnValue([false]);
    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeNull();
  });

  it('renders stack screens without devtools on native platforms', () => {
    mockUseFonts.mockReturnValue([true]);
    const { queryByText } = render(<RootLayout />);
    expect(queryByText('Devtools')).toBeNull();
    const { Stack } = require('expo-router');
    expect(Stack.Screen).toHaveBeenCalledTimes(4);
    const names: string[] = [];
    for (const call of Stack.Screen.mock.calls) {
      names.push(call[0].name);
    }
    expect(names).toEqual(['(auth)', '(tabs)', 'debug', '+not-found']);
  });

  it('renders devtools on web', () => {
    mockUseFonts.mockReturnValue([true]);
    setPlatform('web');
    const { getByText } = render(<RootLayout />);
    expect(getByText('Devtools')).toBeTruthy();
  });
});

