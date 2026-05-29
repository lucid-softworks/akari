import { fireEvent, render } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { Account } from '@/types/account';
import { usePathname, useRouter } from 'expo-router';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/hooks/queries/useUnreadMessagesCount');
jest.mock('@/hooks/queries/useUnreadNotificationsCount');
jest.mock('@/hooks/queries/useAccounts');
jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/useTranslation', () => {
  // Translations moved from a single en.json to a per-namespace directory
  // (@/translations/en) that re-exports a `translations` map.
  const en = require('@/translations/en');

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

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    push = jest.fn();

    mockUseRouter.mockReturnValue({ push, replace: jest.fn() });
    mockUsePathname.mockReturnValue('/(tabs)');
    mockUseUnreadMessagesCount.mockReturnValue({ data: 1 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 2 });
    mockUseAccounts.mockReturnValue({ data: accounts });
    mockUseCurrentAccount.mockReturnValue({ data: accounts[0] });
  });

  it('renders navigation items and account information', () => {
    const { getByText } = render(<Sidebar />);

    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Messages')).toBeTruthy();
    expect(getByText('Search')).toBeTruthy();
    expect(getByText('Bookmarks')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();

    expect(getByText('Alice Chen')).toBeTruthy();
    expect(getByText('@alice')).toBeTruthy();
  });

  it('navigates to the correct route when a navigation item is pressed', () => {
    const { getByText } = render(<Sidebar />);

    fireEvent.press(getByText('Bookmarks'));
    expect(push).toHaveBeenCalledWith('/(tabs)/bookmarks');
  });

  it('marks the active navigation item based on the current path', () => {
    mockUsePathname.mockReturnValue('/(tabs)/notifications');

    const { getByLabelText } = render(<Sidebar />);
    const notificationsButton = getByLabelText('Notifications');

    expect(notificationsButton.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('displays badge counts for messages and notifications', () => {
    const { getByText } = render(<Sidebar />);

    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });
});
