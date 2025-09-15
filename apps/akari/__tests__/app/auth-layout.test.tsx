import { render } from '@testing-library/react-native';
import React from 'react';
import AuthLayout from '@/app/(auth)/_layout';

jest.mock('expo-router', () => {
  const React = require('react');
  const Screen = jest.fn(() => null);
  const Stack = jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>);
  // @ts-ignore
  Stack.Screen = Screen;
  return { Stack };
});

describe('AuthLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders signin screen with correct options', () => {
    const { Stack } = require('expo-router');
    render(<AuthLayout />);
    expect(Stack.Screen).toHaveBeenCalledTimes(1);
    const names: string[] = [];
    const options: unknown[] = [];
    for (const call of Stack.Screen.mock.calls) {
      names.push(call[0].name);
      options.push(call[0].options);
    }
    expect(names).toEqual(['signin']);
    expect(options).toEqual([{ title: 'Authentication', headerShown: false }]);
  });
});

