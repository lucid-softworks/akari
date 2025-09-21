import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import { DialogProvider } from '@/contexts/DialogContext';
import { Account } from '@/types/account';
import { router } from 'expo-router';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { showAlert } from '@/utils/alert';

import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'dismiss' }),
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { Image } = require('react-native');
  return { Image: React.forwardRef((props: any, ref: any) => <Image ref={ref} {...props} />) };
});

jest.mock('expo-router', () => {
  const push = jest.fn();
  const replace = jest.fn();

  return {
    router: { push, replace },
    useRouter: () => ({ push, replace }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/components/LanguageSelector', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { LanguageSelector: () => <Text>language</Text> };
});

jest.mock('@/components/NotificationSettings', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { NotificationSettings: () => <Text>notifications</Text> };
});

jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/hooks/mutations/useSwitchAccount');
jest.mock('@/hooks/mutations/useRemoveAccount');
jest.mock('@/hooks/mutations/useWipeAllData');
jest.mock('@/hooks/mutations/useAddAccount');
jest.mock('@/hooks/mutations/useSignIn');
jest.mock('@/hooks/queries/useAccountProfiles');
jest.mock('@/hooks/queries/useAccounts');
jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');

jest.mock('@/utils/alert', () => ({ showAlert: jest.fn() }));

const mockUseSwitchAccount = useSwitchAccount as jest.Mock;
const mockUseRemoveAccount = useRemoveAccount as jest.Mock;
const mockUseWipeAllData = useWipeAllData as jest.Mock;
const mockUseAddAccount = useAddAccount as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;
const mockUseAccountProfiles = useAccountProfiles as jest.Mock;
const mockUseAccounts = useAccounts as jest.Mock;
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;
const mockRouterPush = router.push as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;

const renderSettings = () =>
  render(
    <DialogProvider>
      <SettingsScreen />
    </DialogProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBorderColor.mockReturnValue('#000');
  mockUseThemeColor.mockImplementation((props: { light?: string; dark?: string }) => {
    if (props.light) return props.light;
    if (props.dark) return props.dark;
    return '#000';
  });
  mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  mockUseAccountProfiles.mockReturnValue({ data: {} });
  mockUseSwitchAccount.mockReturnValue({ mutate: jest.fn() });
  mockUseRemoveAccount.mockReturnValue({ mutate: jest.fn() });
  mockUseWipeAllData.mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue(undefined) });
  mockUseAddAccount.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseSignIn.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

describe('SettingsScreen', () => {
  it('renders accounts and handles actions', async () => {
    const accounts: Account[] = [
      { did: 'did1', handle: 'user1', displayName: 'User One', jwtToken: 't', refreshToken: 'r' },
      { did: 'did2', handle: 'user2', displayName: 'User Two', jwtToken: 't', refreshToken: 'r' },
    ];
    mockUseAccounts.mockReturnValue({ data: accounts });
    mockUseCurrentAccount.mockReturnValue({ data: accounts[0] });

    const registerSpy = jest.spyOn(tabScrollRegistry, 'register');

    const { getByText, getAllByText } = renderSettings();

    await waitFor(() => expect(registerSpy).toHaveBeenCalledWith('settings', expect.any(Function)));

    expect(getAllByText('@user1').length).toBeGreaterThan(0);
    expect(getByText('@user2')).toBeTruthy();
    expect(getAllByText('common.switch')).toHaveLength(1);

    fireEvent.press(getByText('common.switch'));
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'common.switchAccount' })
    );

    fireEvent.press(getAllByText('common.remove')[1]);
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'common.removeAccount' })
    );
  });

  it('shows message when no accounts exist', () => {
    mockUseAccounts.mockReturnValue({ data: [] });
    mockUseCurrentAccount.mockReturnValue({ data: null });

    const { getByText } = renderSettings();

    expect(getByText('common.noAccounts')).toBeTruthy();
  });

  it('opens the add account panel', () => {
    mockUseAccounts.mockReturnValue({ data: [] });
    mockUseCurrentAccount.mockReturnValue({ data: null });

    const { getByText, getByPlaceholderText } = renderSettings();

    fireEvent.press(getByText('common.addAccount'));
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(getByPlaceholderText('auth.blueskyHandlePlaceholder')).toBeTruthy();
  });

  it('logs out all accounts', async () => {
    mockUseAccounts.mockReturnValue({ data: [] });
    mockUseCurrentAccount.mockReturnValue({ data: null });
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseWipeAllData.mockReturnValue({ mutateAsync });

    const { getByText } = renderSettings();

    fireEvent.press(getByText('common.disconnectAllAccounts'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });

  it('confirms switching accounts', () => {
    const accounts: Account[] = [
      { did: 'did1', handle: 'user1', displayName: 'User One', jwtToken: 't', refreshToken: 'r' },
      { did: 'did2', handle: 'user2', displayName: 'User Two', jwtToken: 't', refreshToken: 'r' },
    ];

    const mutate = jest.fn();
    mockUseAccounts.mockReturnValue({ data: accounts });
    mockUseCurrentAccount.mockReturnValue({ data: accounts[0] });
    mockUseSwitchAccount.mockReturnValue({ mutate });

    const { getByText } = renderSettings();

    fireEvent.press(getByText('common.switch'));

    const alertConfig = mockShowAlert.mock.calls[0][0];
    const confirmButton = alertConfig.buttons?.find((button: any) => button.text === 'common.switch');
    confirmButton?.onPress?.();

    expect(mutate).toHaveBeenCalledWith(accounts[1]);
  });

  it('removes current account and navigates home', () => {
    const account: Account = {
      did: 'did1',
      handle: 'user1',
      displayName: 'User One',
      jwtToken: 't',
      refreshToken: 'r',
    };

    const mutate = jest.fn();
    mockUseAccounts.mockReturnValue({ data: [account] });
    mockUseCurrentAccount.mockReturnValue({ data: account });
    mockUseRemoveAccount.mockReturnValue({ mutate });

    const { getByText } = renderSettings();

    fireEvent.press(getByText('common.remove'));

    const alertConfig = mockShowAlert.mock.calls[0][0];
    const removeButton = alertConfig.buttons?.find((button: any) => button.text === 'common.remove');
    removeButton?.onPress?.();

    expect(mutate).toHaveBeenCalledWith(account.did);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows error alert when logout fails', async () => {
    mockUseAccounts.mockReturnValue({ data: [] });
    mockUseCurrentAccount.mockReturnValue({ data: null });
    const mutateAsync = jest.fn().mockRejectedValue(new Error('fail'));
    mockUseWipeAllData.mockReturnValue({ mutateAsync });

    const { getByText } = renderSettings();

    fireEvent.press(getByText('common.disconnectAllAccounts'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'common.error', message: 'common.failedToLogout' })
      )
    );
  });
});

