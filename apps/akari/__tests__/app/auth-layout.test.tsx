import { render } from '@testing-library/react-native';
import React from 'react';
import AuthLayout from '@/app/(auth)/_layout';

jest.mock('expo-router', () => {
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

  it('renders signin, oauth, password, and signup screens with correct options', () => {
    const { Stack } = require('expo-router');
    render(<AuthLayout />);
    expect(Stack.Screen).toHaveBeenCalledTimes(5);
    const names: string[] = [];
    const options: unknown[] = [];
    for (const call of Stack.Screen.mock.calls) {
      names.push(call[0].name);
      options.push(call[0].options);
    }
    expect(names).toEqual(['signin', 'oauth', 'password', 'mastodon', 'signup']);
    // `headerShown` is `Platform.OS !== 'web'`, which is `true` under the
    // jest react-native preset (Platform.OS defaults to 'ios').
    expect(options).toEqual([
      { title: 'Sign In', headerShown: false },
      { title: 'Sign in with atproto', headerShown: true },
      { title: 'Sign in with app password', headerShown: true },
      { title: 'Sign in with Mastodon', headerShown: true },
      { title: 'Create account', headerShown: true },
    ]);
  });
});

