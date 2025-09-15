import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import AuthScreen from '@/app/(auth)/signin';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { showAlert } from '@/utils/alert';
import { getPdsUrlFromHandle } from '@/bluesky-api';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: (props: any) => <View {...props} /> };
});

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/mutations/useAddAccount');
const mockUseAddAccount = useAddAccount as jest.Mock;

jest.mock('@/hooks/mutations/useSignIn');
const mockUseSignIn = useSignIn as jest.Mock;

jest.mock('@/hooks/mutations/useSwitchAccount');
const mockUseSwitchAccount = useSwitchAccount as jest.Mock;

jest.mock('@/hooks/queries/useCurrentAccount');
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;

jest.mock('@/utils/alert', () => ({ showAlert: jest.fn() }));
const mockShowAlert = showAlert as jest.Mock;

jest.mock('@/bluesky-api', () => ({ getPdsUrlFromHandle: jest.fn() }));
const mockGetPdsUrlFromHandle = getPdsUrlFromHandle as jest.Mock;

const mockRouterReplace = router.replace as jest.Mock;

let signInMutate: jest.Mock;
let addAccountMutate: jest.Mock;
let switchAccountMutate: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  signInMutate = jest.fn().mockResolvedValue({
    did: 'did',
    handle: 'handle',
    accessJwt: 'token',
    refreshJwt: 'refresh',
  });
  addAccountMutate = jest.fn().mockResolvedValue({
    did: 'did',
    handle: 'handle',
    jwtToken: 'token',
    refreshToken: 'refresh',
    pdsUrl: 'https://pds',
  });
  switchAccountMutate = jest.fn().mockResolvedValue(undefined);

  mockUseSignIn.mockReturnValue({ mutateAsync: signInMutate, isPending: false });
  mockUseAddAccount.mockReturnValue({ mutateAsync: addAccountMutate });
  mockUseSwitchAccount.mockReturnValue({ mutateAsync: switchAccountMutate });
  mockUseCurrentAccount.mockReturnValue({ data: null });
  mockGetPdsUrlFromHandle.mockResolvedValue('https://pds');
});

describe('AuthScreen', () => {
  it('shows error when fields are empty', () => {
    const { getByText } = render(<AuthScreen />);

    fireEvent.press(getByText('common.signIn'));

    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'common.error',
        message: 'auth.fillAllFields',
      }),
    );
  });

  it('shows error for invalid handle', () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);

    fireEvent.changeText(getByPlaceholderText('auth.blueskyHandlePlaceholder'), 'invalid handle!');
    fireEvent.changeText(getByPlaceholderText('auth.appPasswordPlaceholder'), 'pass');

    fireEvent.press(getByText('common.signIn'));

    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'common.error',
        message: 'auth.invalidBlueskyHandle',
      }),
    );
  });

  it('signs in successfully', async () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);

    fireEvent.changeText(getByPlaceholderText('auth.blueskyHandlePlaceholder'), 'user');
    fireEvent.changeText(getByPlaceholderText('auth.appPasswordPlaceholder'), 'password');

    fireEvent.press(getByText('common.signIn'));

    await waitFor(() => {
      expect(switchAccountMutate).toHaveBeenCalled();
    });

    expect(signInMutate).toHaveBeenCalledWith({
      identifier: 'user',
      password: 'password',
      pdsUrl: 'https://pds',
    });
    expect(addAccountMutate).toHaveBeenCalledWith({
      did: 'did',
      handle: 'handle',
      jwtToken: 'token',
      refreshToken: 'refresh',
      pdsUrl: 'https://pds',
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'common.success',
        message: 'auth.signedInSuccessfully',
      }),
    );

    const alertConfig = mockShowAlert.mock.calls[0][0];
    alertConfig.buttons[0].onPress();
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('signs up successfully after toggling', async () => {
    const { getByText, getByPlaceholderText } = render(<AuthScreen />);

    fireEvent.press(getByText('auth.connectNew'));

    fireEvent.changeText(getByPlaceholderText('auth.blueskyHandlePlaceholder'), 'user');
    fireEvent.changeText(getByPlaceholderText('auth.appPasswordPlaceholder'), 'password');

    fireEvent.press(getByText('auth.connectAccount'));

    await waitFor(() => {
      expect(switchAccountMutate).toHaveBeenCalled();
    });

    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'common.success',
        message: 'auth.connectedSuccessfully',
      }),
    );

    const alertConfig = mockShowAlert.mock.calls[0][0];
    alertConfig.buttons[0].onPress();
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
  });
});

