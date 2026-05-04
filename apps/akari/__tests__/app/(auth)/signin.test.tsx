import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import SignInScreen from '@/app/(auth)/signin';

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
  },
}));

jest.mock('expo-image', () => ({ Image: () => null }));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000',
}));

jest.mock('@/components/ui/IconSymbol', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    IconSymbol: ({ name }: { name: string }) => <Text testID={`icon-${name}`}>{name}</Text>,
  };
});

beforeEach(() => {
  mockRouterPush.mockReset();
});

describe('Auth method picker', () => {
  it('renders the welcome copy and both choices', () => {
    const { getByText } = render(<SignInScreen />);
    expect(getByText('auth.welcomeTitle')).toBeTruthy();
    expect(getByText('auth.oauthChoiceTitle')).toBeTruthy();
    expect(getByText('auth.passwordChoiceTitle')).toBeTruthy();
  });

  it('routes to /(auth)/oauth when the atproto choice is tapped', () => {
    const { getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('auth.oauthChoiceTitle'));
    expect(mockRouterPush).toHaveBeenCalledWith('/(auth)/oauth');
  });

  it('routes to /(auth)/password when the app-password choice is tapped', () => {
    const { getByText } = render(<SignInScreen />);
    fireEvent.press(getByText('auth.passwordChoiceTitle'));
    expect(mockRouterPush).toHaveBeenCalledWith('/(auth)/password');
  });
});
