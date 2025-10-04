import { fireEvent, render } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { DialogProvider } from '@/contexts/DialogContext';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { Account } from '@/types/account';
import { usePathname, useRouter } from 'expo-router';

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, children, ...props }: any) =>
      visible ? React.createElement(View, props, children) : null,
  };
});

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/hooks/queries/useUnreadMessagesCount');
jest.mock('@/hooks/queries/useUnreadNotificationsCount');
jest.mock('@/hooks/queries/useAccounts');
jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/mutations/useSwitchAccount');
jest.mock('@/hooks/mutations/useAddAccount');
jest.mock('@/hooks/mutations/useSignIn');
jest.mock('@/utils/alert', () => ({ showAlert: jest.fn() }));
jest.mock('@/hooks/useTranslation', () => {
  const en = require('@/translations/en.json');

  const flatten = (object: Record<string, unknown>, prefix = ''): Record<string, string> => {
    return Object.entries(object).reduce<Record<string, string>>((acc, [key, value]) => {
      const nextKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(acc, flatten(value as Record<string, unknown>, nextKey));
      } else if (typeof value === 'string') {
        acc[nextKey] = value;
      }

      return acc;
    }, {});
  };

  const translations = flatten(en.translations);

  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      changeLanguage: jest.fn(),
      currentLocale: 'en',
      availableLocales: ['en'],
      locale: 'en',
    }),
  };
});

const mockUseRouter = useRouter as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;
const mockUseUnreadMessagesCount = useUnreadMessagesCount as jest.Mock;
const mockUseUnreadNotificationsCount = useUnreadNotificationsCount as jest.Mock;
const mockUseAccounts = useAccounts as jest.Mock;
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseSwitchAccount = useSwitchAccount as jest.Mock;
const mockUseAddAccount = useAddAccount as jest.Mock;
const mockUseSignIn = useSignIn as jest.Mock;

const accounts: Account[] = [
  {
    did: 'did:plc:alice',
    handle: 'alice',
    displayName: 'Alice Chen',
    avatar: undefined,
    jwtToken: 'token-1',
    refreshToken: 'refresh-1',
    pdsUrl: 'https://pds.one',
  },
  {
    did: 'did:plc:alice-work',
    handle: 'alice.work',
    displayName: 'Alice Work',
    avatar: undefined,
    jwtToken: 'token-2',
    refreshToken: 'refresh-2',
    pdsUrl: 'https://pds.two',
  },
];

let push: jest.Mock;
let replace: jest.Mock;
let switchAccountMutate: jest.Mock;
let switchAccountMutateAsync: jest.Mock;
let addAccountMutateAsync: jest.Mock;
let signInMutateAsync: jest.Mock;

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    push = jest.fn();
    replace = jest.fn();
    switchAccountMutate = jest.fn();
    switchAccountMutateAsync = jest.fn();
    addAccountMutateAsync = jest.fn();
    signInMutateAsync = jest.fn();

    mockUseRouter.mockReturnValue({ push, replace });
    mockUsePathname.mockReturnValue('/(tabs)');
    mockUseUnreadMessagesCount.mockReturnValue({ data: 1 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 2 });
    mockUseAccounts.mockReturnValue({ data: accounts });
    mockUseCurrentAccount.mockReturnValue({ data: accounts[0] });
    mockUseSwitchAccount.mockReturnValue({
      mutate: switchAccountMutate,
      mutateAsync: switchAccountMutateAsync,
      isPending: false,
    });
    mockUseAddAccount.mockReturnValue({ mutateAsync: addAccountMutateAsync, isPending: false });
    mockUseSignIn.mockReturnValue({ mutateAsync: signInMutateAsync, isPending: false });
  });

  it('renders navigation items, trending tags, and account information', () => {
    const { getByText } = render(
      <DialogProvider>
        <Sidebar />
      </DialogProvider>,
    );

    expect(getByText('Timeline')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Messages')).toBeTruthy();
    expect(getByText('Discover')).toBeTruthy();
    expect(getByText('Bookmarks')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();

    expect(getByText('#BlueskyMigration')).toBeTruthy();
    expect(getByText('Alice Chen')).toBeTruthy();
    expect(getByText('@alice')).toBeTruthy();
  });

  it('navigates to the correct route when a navigation item is pressed', () => {
    const { getByText } = render(
      <DialogProvider>
        <Sidebar />
      </DialogProvider>,
    );

    fireEvent.press(getByText('Bookmarks'));
    expect(push).toHaveBeenCalledWith('/(tabs)/(bookmarks)');
  });

  it('toggles the collapsed state of the sidebar', () => {
    const { getByText, getByLabelText, queryByText } = render(
      <DialogProvider>
        <Sidebar />
      </DialogProvider>,
    );

    fireEvent.press(getByText('Collapse'));
    expect(queryByText('Timeline')).toBeNull();
    expect(queryByText('#BlueskyMigration')).toBeNull();

    fireEvent.press(getByLabelText('Expand sidebar'));
    expect(getByText('Timeline')).toBeTruthy();
  });

  it('opens the account selector, allows switching accounts, and opens the add account panel', () => {
    const { getByText, getByPlaceholderText } = render(
      <DialogProvider>
        <Sidebar />
      </DialogProvider>,
    );

    fireEvent.press(getByText('Alice Chen'));
    expect(getByText('@alice.work')).toBeTruthy();

    fireEvent.press(getByText('Alice Work'));
    expect(switchAccountMutate).toHaveBeenCalledWith(accounts[1]);

    fireEvent.press(getByText('Alice Chen'));
    fireEvent.press(getByText('+ Add account'));
    expect(push).not.toHaveBeenCalledWith('/(auth)/signin?addAccount=true');
    expect(getByPlaceholderText('username.bsky.social or @username')).toBeTruthy();
  });

  it('marks the active navigation item based on the current path', () => {
    mockUsePathname.mockReturnValue('/(tabs)/(notifications)');

    const { getByLabelText } = render(
      <DialogProvider>
        <Sidebar />
      </DialogProvider>,
    );
    const notificationsButton = getByLabelText('Notifications');

    expect(notificationsButton.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });
});
