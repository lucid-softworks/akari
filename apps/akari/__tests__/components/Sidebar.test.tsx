import { fireEvent, render } from '@testing-library/react-native';

import { Sidebar } from '@/components/Sidebar';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { usePathname, useRouter } from 'expo-router';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/hooks/queries/useUnreadMessagesCount');
jest.mock('@/hooks/queries/useUnreadNotificationsCount');

const mockUseRouter = useRouter as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;
const mockUseUnreadMessagesCount = useUnreadMessagesCount as jest.Mock;
const mockUseUnreadNotificationsCount = useUnreadNotificationsCount as jest.Mock;

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn() });
    mockUsePathname.mockReturnValue('/(tabs)');
    mockUseUnreadMessagesCount.mockReturnValue({ data: 1 });
    mockUseUnreadNotificationsCount.mockReturnValue({ data: 2 });
  });

  it('renders navigation items, trending tags, and account information', () => {
    const { getByText } = render(<Sidebar />);

    expect(getByText('Timeline')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Messages')).toBeTruthy();
    expect(getByText('Discover')).toBeTruthy();
    expect(getByText('Bookmarks')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();

    expect(getByText('#BlueskyMigration')).toBeTruthy();
    expect(getByText('Alice Chen')).toBeTruthy();
    expect(getByText('@alice')).toBeTruthy();
  });

  it('navigates to the correct route when a navigation item is pressed', () => {
    const push = jest.fn();
    mockUseRouter.mockReturnValue({ push });

    const { getByText } = render(<Sidebar />);

    fireEvent.press(getByText('Discover'));
    expect(push).toHaveBeenCalledWith('/(tabs)/search');
  });

  it('toggles the collapsed state of the sidebar', () => {
    const { getByText, getByLabelText, queryByText } = render(<Sidebar />);

    fireEvent.press(getByText('Collapse'));
    expect(queryByText('Timeline')).toBeNull();
    expect(queryByText('#BlueskyMigration')).toBeNull();

    fireEvent.press(getByLabelText('Expand sidebar'));
    expect(getByText('Timeline')).toBeTruthy();
  });

  it('opens the account selector and add account modal', () => {
    const { getByText, queryByText } = render(<Sidebar />);

    fireEvent.press(getByText('Alice Chen'));
    expect(getByText('+ Add account')).toBeTruthy();

    fireEvent.press(getByText('+ Add account'));
    expect(getByText('Add Account')).toBeTruthy();

    fireEvent.press(getByText('Cancel'));
    expect(queryByText('Add Account')).toBeNull();
  });

  it('marks the active navigation item based on the current path', () => {
    mockUsePathname.mockReturnValue('/(tabs)/notifications');

    const { getByLabelText } = render(<Sidebar />);
    const notificationsButton = getByLabelText('Notifications');

    expect(notificationsButton.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });
});
