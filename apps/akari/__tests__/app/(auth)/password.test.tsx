import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import type { RenderAPI } from '@testing-library/react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';

import AuthScreen from '@/app/(auth)/password';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { showAlert } from '@/utils/alert';
import { getPdsUrlFromHandle } from '@/bluesky-api';
jest.mock('expo-router', () => {
  const ReactLib = require('react');
  return {
    Redirect: ({ href }: { href: string }) =>
      ReactLib.createElement('Redirect', { 'data-href': href, testID: `redirect-${href}` }),
  };
});

jest.mock('@/components/ThemedText', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => ReactLib.createElement(Text, props) };
});

jest.mock('@/components/ThemedView', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return { ThemedView: (props: any) => ReactLib.createElement(View, props) };
});

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/hooks/mutations/useAddAccount');
const mockUseAddAccount = useAddAccount as jest.Mock;

jest.mock('@/hooks/mutations/useSignIn');
const mockUseSignIn = useSignIn as jest.Mock;

jest.mock('@/hooks/mutations/useSwitchAccount');
const mockUseSwitchAccount = useSwitchAccount as jest.Mock;

jest.mock('@/hooks/queries/useCurrentAccount');
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;

jest.mock('@/hooks/queries/useTypeaheadActors', () => ({
  useTypeaheadActors: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/utils/alert', () => ({ showAlert: jest.fn() }));
const mockShowAlert = showAlert as jest.Mock;

jest.mock('@/bluesky-api', () => ({ getPdsUrlFromHandle: jest.fn() }));
const mockGetPdsUrlFromHandle = getPdsUrlFromHandle as jest.Mock;

const handlePlaceholder = 'auth.blueskyHandlePlaceholder';
const passwordPlaceholder = 'auth.appPasswordPlaceholder';

let signInMutate: jest.Mock;
let addAccountMutate: jest.Mock;
let switchAccountMutate: jest.Mock;

const renderScreen = () => render(<AuthScreen />);

const fillCredentials = (
  utils: RenderAPI,
  { handle = 'user', password = 'password' }: { handle?: string; password?: string } = {},
) => {
  fireEvent.changeText(utils.getByPlaceholderText(handlePlaceholder), handle);
  fireEvent.changeText(utils.getByPlaceholderText(passwordPlaceholder), password);
};

beforeEach(() => {
  jest.clearAllMocks();
  signInMutate = jest.fn().mockResolvedValue({
    did: 'did',
    handle: 'handle',
    accessJwt: 'token',
    refreshJwt: 'refresh',
    pdsUrl: 'https://pds',
    profile: {
      did: 'did',
      handle: 'handle',
      displayName: 'Display Name',
      avatar: 'https://avatar.test/img.png',
      indexedAt: '2024-01-01T00:00:00.000Z',
    },
  });
  addAccountMutate = jest.fn().mockResolvedValue({
    did: 'did',
    handle: 'handle',
    displayName: 'Display Name',
    avatar: 'https://avatar.test/img.png',
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
    const { getByText } = renderScreen();

    fireEvent.press(getByText('common.signIn'));

    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'common.error',
        message: 'auth.fillAllFields',
      }),
    );
  });

  it('shows error for invalid handle', () => {
    const utils = renderScreen();

    fillCredentials(utils, { handle: 'invalid handle!', password: 'pass' });
    fireEvent.press(utils.getByText('common.signIn'));

    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'common.error',
        message: 'auth.invalidBlueskyHandle',
      }),
    );
  });

  it('shows error when PDS server cannot be detected while signing in', async () => {
    mockGetPdsUrlFromHandle.mockResolvedValueOnce(null);
    const utils = renderScreen();

    fillCredentials(utils);
    fireEvent.press(utils.getByText('common.signIn'));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'common.error',
          message: 'Could not detect PDS server for this handle',
        }),
      );
    });

    expect(signInMutate).not.toHaveBeenCalled();
  });

  it('shows error when sign in mutation throws', async () => {
    signInMutate.mockRejectedValueOnce(new Error('boom'));
    const utils = renderScreen();

    fillCredentials(utils);
    fireEvent.press(utils.getByText('common.signIn'));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'common.error',
          message: 'boom',
        }),
      );
    });
  });

  it('falls back to default sign in error message when error is not an Error instance', async () => {
    signInMutate.mockRejectedValueOnce('failure');
    const utils = renderScreen();

    fillCredentials(utils);
    fireEvent.press(utils.getByText('common.signIn'));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'common.error',
          message: 'auth.signInFailed',
        }),
      );
    });
  });

  it('signs in successfully', async () => {
    const utils = renderScreen();

    fillCredentials(utils);
    fireEvent.press(utils.getByText('common.signIn'));

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
      displayName: 'Display Name',
      avatar: 'https://avatar.test/img.png',
      jwtToken: 'token',
      refreshToken: 'refresh',
      pdsUrl: 'https://pds',
    });

    await waitFor(() => {
      expect(utils.getByTestId('redirect-/')).toBeTruthy();
    });
  });

  it('submits sign in when pressing enter on the password input', async () => {
    const utils = renderScreen();

    fillCredentials(utils);
    fireEvent(utils.getByPlaceholderText(passwordPlaceholder), 'submitEditing');

    await waitFor(() => {
      expect(signInMutate).toHaveBeenCalledWith({
        identifier: 'user',
        password: 'password',
        pdsUrl: 'https://pds',
      });
    });
  });

  it('does not submit when pressing enter on the handle input — moves focus to the password field instead', () => {
    const utils = renderScreen();

    fillCredentials(utils);
    fireEvent(utils.getByPlaceholderText(handlePlaceholder), 'submitEditing');

    expect(signInMutate).not.toHaveBeenCalled();
  });

  it('signs in and routes to settings when adding an account', async () => {
    mockUseCurrentAccount.mockReturnValue({ data: { did: 'did:existing' } });
    const utils = renderScreen();

    expect(utils.queryByText('auth.needDifferentAccount')).toBeNull();

    fillCredentials(utils);
    const addAccountButtons = utils.getAllByText('common.addAccount');
    fireEvent.press(addAccountButtons[addAccountButtons.length - 1]);

    await waitFor(() => {
      expect(utils.getByTestId('redirect-/(tabs)/settings')).toBeTruthy();
    });
  });

  it('shows loading state while signing in', () => {
    mockUseSignIn.mockReturnValue({ mutateAsync: signInMutate, isPending: true });
    const utils = renderScreen();

    expect(utils.getByText('auth.signingIn')).toBeTruthy();
  });

  it('shows loading state when adding an account to existing user', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { did: 'did:existing' } });
    mockUseSignIn.mockReturnValue({ mutateAsync: signInMutate, isPending: true });
    const utils = renderScreen();

    expect(utils.getByText('auth.addingAccount')).toBeTruthy();
  });

  it('uses height keyboard behavior on non-iOS platforms', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    try {
      const utils = renderScreen();
      expect(utils.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('height');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(Platform, 'OS', originalDescriptor);
      }
    }
  });
});

