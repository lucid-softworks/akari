import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings/index';
import AccountSettingsScreen from '@/app/(tabs)/settings/account';
import { DialogProvider } from '@/contexts/DialogContext';
import { Account } from '@/types/account';
import { router, usePathname } from 'expo-router';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { showAlert } from '@/utils/alert';

import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useRemoveAccount } from '@/hooks/mutations/useRemoveAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useSession } from '@/hooks/queries/useSession';
import { useProfileRecord } from '@/hooks/queries/useProfileRecord';
import { useResponsive } from '@/hooks/useResponsive';

jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'dismiss' }),
}));

jest.mock('expo-image', () => {
  const ReactLib = require('react');
  const { Image } = require('react-native');
  return { Image: ReactLib.forwardRef((props: any, ref: any) => ReactLib.createElement(Image, { ref, ...props })) };
});

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  const push = jest.fn();
  const replace = jest.fn();
  const mockUsePathname = jest.fn(() => '/(tabs)/settings/account');

  return {
    router: { push, replace },
    useRouter: () => ({ push, replace }),
    usePathname: mockUsePathname,
    // account.tsx renders <Redirect> after wiping all data on sign-out.
    Redirect: ({ href }: { href: string }) => <Text>redirect:{href}</Text>,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/components/LanguageSelector', () => {
  const { Text } = require('react-native');
  return { LanguageSelector: () => <Text>language</Text> };
});

jest.mock('@/components/NotificationSettings', () => {
  const { Text } = require('react-native');
  return { NotificationSettings: () => <Text>notifications</Text> };
});

jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/ThemedView', () => {
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
jest.mock('@/hooks/queries/useIsGuest');
jest.mock('@/hooks/queries/useSession');
jest.mock('@/hooks/queries/useProfileRecord', () => ({
  useProfileRecord: jest.fn(() => ({ data: undefined })),
  isAccountAutomated: jest.fn(() => false),
}));
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useNotImplementedToast');
jest.mock('@/hooks/useResponsive');

// The settings index opens the add-account flow through the DialogManager
// using AddAccountModal; stub it so the test doesn't pull in the OAuth stack.
jest.mock('@/components/AddAccountModal', () => {
  const { Text } = require('react-native');
  return { AddAccountModal: () => <Text>add-account-modal</Text> };
});

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
const mockUsePathname = usePathname as jest.Mock;
const mockUseNotImplementedToast = useNotImplementedToast as jest.Mock;
const mockUseIsGuest = useIsGuest as jest.Mock;
const mockUseSession = useSession as jest.Mock;
const mockUseProfileRecord = useProfileRecord as jest.Mock;
const mockUseResponsive = useResponsive as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;
const mockRouterPush = router.push as jest.Mock;
const mockRouterReplace = router.replace as jest.Mock;

const renderSettingsIndex = () =>
  render(
    <DialogProvider>
      <SettingsScreen />
    </DialogProvider>,
  );

const renderAccountSettings = () =>
  render(
    <DialogProvider>
      <AccountSettingsScreen />
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
  mockUseAccounts.mockReturnValue({ data: [] });
  mockUseCurrentAccount.mockReturnValue({ data: null });
  mockUsePathname.mockReturnValue('/(tabs)/settings/account');
  mockUseSwitchAccount.mockReturnValue({ mutate: jest.fn() });
  mockUseRemoveAccount.mockReturnValue({ mutate: jest.fn() });
  mockUseWipeAllData.mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue(undefined) });
  mockUseAddAccount.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseSignIn.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseNotImplementedToast.mockReturnValue(jest.fn());
  // Both screens gate on useIsGuest; default to a signed-in (non-guest)
  // session so the real account/settings content renders.
  mockUseIsGuest.mockReturnValue(false);
  mockUseSession.mockReturnValue({ data: undefined });
  mockUseProfileRecord.mockReturnValue({ data: undefined });
  mockUseResponsive.mockReturnValue({ isLargeScreen: false, isDesktop: false });
});

describe('Settings index screen', () => {
  it('registers scroll handler and navigates to account settings', async () => {
    const accounts: Account[] = [
      { did: 'did1', handle: 'user1', displayName: 'User One', jwtToken: 't', refreshToken: 'r' },
      { did: 'did2', handle: 'user2', displayName: 'User Two', jwtToken: 't', refreshToken: 'r' },
    ];
    mockUseAccounts.mockReturnValue({ data: accounts });
    mockUseCurrentAccount.mockReturnValue({ data: accounts[0] });

    const registerSpy = jest.spyOn(tabScrollRegistry, 'register');

    const { getByText } = renderSettingsIndex();

    await waitFor(() => expect(registerSpy).toHaveBeenCalledWith('settings', expect.any(Function)));

    expect(getByText('@user1')).toBeTruthy();

    // Profile card navigates to account settings
    fireEvent.press(getByText('settings.account'));
    expect(mockRouterPush).toHaveBeenCalledWith('/(tabs)/settings/account');
  });

  it('opens the add-account modal from the switch-account row', () => {
    // With no other accounts signed in the switch row shows "Add account" and
    // now opens AddAccountModal through the DialogManager instead of routing
    // to a dedicated add-account page.
    const { getByText } = renderSettingsIndex();

    fireEvent.press(getByText('common.addAccount'));
    expect(getByText('add-account-modal')).toBeTruthy();
    expect(mockRouterPush).not.toHaveBeenCalledWith('/(tabs)/settings/add-account');
  });
});

describe('AccountSettingsScreen', () => {
  it('shows message when no accounts exist', () => {
    const { getByText } = renderAccountSettings();

    expect(getByText('common.noAccounts')).toBeTruthy();
  });

  it('logs out all accounts', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseWipeAllData.mockReturnValue({ mutateAsync });

    const { getByText } = renderAccountSettings();

    fireEvent.press(getByText('common.signOutAllAccounts'));
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

    const { getByText, getAllByText } = renderAccountSettings();

    // Press the Switch button on the non-current account row.
    fireEvent.press(getByText('common.switch'));

    // The implementation now renders a ConfirmDialog (via useConfirm) instead
    // of calling showAlert. The dialog shows two buttons; press the Switch
    // confirmation, which is the second 'common.switch' text in the tree
    // (the first being the row's Switch button still rendered behind it).
    const switchTexts = getAllByText('common.switch');
    fireEvent.press(switchTexts[switchTexts.length - 1]);

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

    const { getByText, getAllByText } = renderAccountSettings();

    // Press the row's Remove button, which now opens a ConfirmDialog (via
    // useConfirm) rather than calling showAlert. Confirm by pressing the
    // dialog's destructive "Remove" button (the last 'common.remove' in tree).
    fireEvent.press(getByText('common.remove'));

    const removeTexts = getAllByText('common.remove');
    fireEvent.press(removeTexts[removeTexts.length - 1]);

    expect(mutate).toHaveBeenCalledWith(account.did);
    expect(mockRouterReplace).toHaveBeenCalledWith('/');
  });

  it('shows an error dialog when logout fails', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('fail'));
    mockUseWipeAllData.mockReturnValue({ mutateAsync });

    const { getByText } = renderAccountSettings();

    fireEvent.press(getByText('common.signOutAllAccounts'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    // The failure path now surfaces a themed ConfirmDialog (via useConfirm)
    // instead of the native showAlert.
    await waitFor(() => expect(getByText('common.error')).toBeTruthy());
    expect(getByText('common.failedToLogout')).toBeTruthy();
    expect(mockShowAlert).not.toHaveBeenCalled();
  });
});

