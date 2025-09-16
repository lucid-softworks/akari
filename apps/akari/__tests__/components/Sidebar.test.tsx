import { fireEvent, render } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter, usePathname } from 'expo-router';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/hooks/queries/useUnreadMessagesCount');
jest.mock('@/hooks/queries/useUnreadNotificationsCount');
jest.mock('@/hooks/useColorScheme');

const mockUseRouter = useRouter as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;
const mockUseUnreadMessagesCount = useUnreadMessagesCount as jest.Mock;
const mockUseUnreadNotificationsCount = useUnreadNotificationsCount as jest.Mock;
const mockUseColorScheme = useColorScheme as jest.Mock;

const flattenStyles = (style: unknown): any[] =>
  Array.isArray(style) ? style.flat(Infinity) : [style];

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn() });
    mockUsePathname.mockReturnValue('/(tabs)');
    mockUseUnreadMessagesCount.mockReturnValue({ data: 0 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 0 });
    mockUseColorScheme.mockReturnValue('light');
  });

  it('renders navigation items with badges', () => {
    mockUseUnreadMessagesCount.mockReturnValue({ data: 3 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 5 });

    const { getByText } = render(<Sidebar />);

    expect(getByText('Discover')).toBeTruthy();
    expect(getByText('Inbox')).toBeTruthy();
    expect(getByText('You')).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Search')).toBeTruthy();
    expect(getByText('Messages')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Your personalized feed')).toBeTruthy();
    expect(getByText('Find people and communities')).toBeTruthy();

    expect(getByText('3')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('navigates to path on press', () => {
    const push = jest.fn();
    mockUseRouter.mockReturnValue({ push });

    const { getByText } = render(<Sidebar />);

    fireEvent.press(getByText('Search'));
    expect(push).toHaveBeenCalledWith('/(tabs)/search');
  });

  it('highlights the active item', () => {
    mockUsePathname.mockReturnValue('/(tabs)/search');

    const { getByText } = render(<Sidebar />);

    const activeText = getByText('Search');
    const inactiveText = getByText('Home');

    const activeStyles = flattenStyles(activeText.props.style);
    const inactiveStyles = flattenStyles(inactiveText.props.style);

    expect(activeStyles).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontWeight: '600' })]),
    );
    expect(inactiveStyles).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontWeight: '400' })]),
    );
  });
});
