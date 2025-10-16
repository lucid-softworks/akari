import { render } from '@testing-library/react-native';
import React from 'react';

import MessagesLayout from '@/app/(tabs)/messages/_layout';
import { useResponsive } from '@/hooks/useResponsive';

jest.mock('expo-router', () => {
  const React = require('react');
  const Screen = jest.fn(() => null);
  const Stack = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);
  // @ts-ignore
  Stack.Screen = Screen;
  return { Stack };
});

jest.mock('@/hooks/useResponsive');

const mockUseResponsive = useResponsive as jest.Mock;

describe('MessagesLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseResponsive.mockReturnValue({ isLargeScreen: false });
  });

  it('hides the stack header on mobile to defer to the shared drawer header', () => {
    const { Stack } = require('expo-router');
    render(<MessagesLayout />);
    expect(Stack.mock.calls[0][0].screenOptions).toMatchObject({
      headerShown: false,
      headerBackVisible: true,
      headerBackButtonDisplayMode: 'minimal',
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
    });
    expect(Stack.Screen).toHaveBeenCalledTimes(5);
    const names: string[] = [];
    for (const call of Stack.Screen.mock.calls) {
      names.push(call[0].name);
    }
    expect(names).toEqual(['index', 'pending', '[handle]', 'user-profile/[handle]', 'user-profile/[handle]/post/[rkey]']);
  });

  it('restores the native header on large screens', () => {
    mockUseResponsive.mockReturnValue({ isLargeScreen: true });
    const { Stack } = require('expo-router');
    render(<MessagesLayout />);
    expect(Stack.mock.calls[0][0].screenOptions).toMatchObject({
      headerShown: true,
      headerBackVisible: true,
      headerBackButtonDisplayMode: 'minimal',
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
    });
  });
});
