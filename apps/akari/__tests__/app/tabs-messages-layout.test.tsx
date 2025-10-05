import { render } from '@testing-library/react-native';
import React from 'react';
import MessagesLayout from '@/app/(tabs)/messages/_layout';

jest.mock('expo-router', () => {
  const React = require('react');
  const Screen = jest.fn(() => null);
  const Stack = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);
  // @ts-ignore
  Stack.Screen = Screen;
  return { Stack };
});

describe('MessagesLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders stack with nested post screen', () => {
    const { Stack } = require('expo-router');
    render(<MessagesLayout />);
    expect(Stack.mock.calls[0][0].screenOptions).toEqual({ headerShown: false });
    expect(Stack.Screen).toHaveBeenCalledTimes(4);
    const names: string[] = [];
    for (const call of Stack.Screen.mock.calls) {
      names.push(call[0].name);
    }
    expect(names).toEqual(['index', 'pending', '[handle]', 'post/[id]']);
  });
});
