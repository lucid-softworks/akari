import React from 'react';
import { render } from '@testing-library/react-native';

import HomeTabLayout from '@/app/(tabs)/index/_layout';
import SearchTabLayout from '@/app/(tabs)/search/_layout';
import NotificationsTabLayout from '@/app/(tabs)/notifications/_layout';
import ProfileTabLayout from '@/app/(tabs)/profile/_layout';

jest.mock('expo-router', () => {
  const React = require('react');
  const Screen = jest.fn(() => null);
  const Stack = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);
  // @ts-ignore
  Stack.Screen = Screen;
  return { Stack };
});

describe('Tab stacks include nested post routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const cases: Array<[
    string,
    React.ComponentType,
  ]> = [
    ['home', HomeTabLayout],
    ['search', SearchTabLayout],
    ['notifications', NotificationsTabLayout],
    ['profile', ProfileTabLayout],
  ];

  it.each(cases)('%s tab layout registers post screen', (_name, Layout) => {
    const { Stack } = require('expo-router');
    Stack.mockClear();
    Stack.Screen.mockClear();

    render(<Layout />);

    expect(Stack.mock.calls[0][0].screenOptions).toEqual({ headerShown: false });
    const names = Stack.Screen.mock.calls.map((call: any[]) => call[0].name);
    expect(names).toContain('post/[id]');
  });
});
