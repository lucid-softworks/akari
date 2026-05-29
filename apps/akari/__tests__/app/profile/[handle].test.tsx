import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import ProfileScreen from '@/app/(tabs)/profile/[handle]';
import { useLocalSearchParams } from 'expo-router';

// The profile screen used to own all the profile UI (header, dropdown menu,
// tab switching, clipboard/report/mute actions). That logic now lives in the
// `ProfileView` component and the `useProfileMenuItems` hook; the route is a
// thin wrapper that resolves the `handle` param, configures the native Stack
// header, and renders `<ProfileView />`. These tests cover the wrapper's
// remaining responsibilities — the moved behavior is exercised where it now
// lives.
jest.mock('expo-router', () => {
  const ReactLib = require('react');
  const Screen = jest.fn(() => null);
  const Stack: any = jest.fn(({ children }: any) => ReactLib.createElement(ReactLib.Fragment, null, children));
  Stack.Screen = Screen;
  return {
    useLocalSearchParams: jest.fn(),
    Stack,
  };
});

jest.mock('@/components/ProfileView', () => {
  const { Text } = require('react-native');
  const mock = jest.fn(({ handle }: { handle: string }) => <Text>{`profile-view ${handle}`}</Text>);
  return { __esModule: true, default: mock };
});

const { Stack } = require('expo-router');
const ProfileViewMock = require('@/components/ProfileView').default as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ProfileView with the resolved handle', () => {
    mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('profile-view alice')).toBeTruthy();
    expect(ProfileViewMock).toHaveBeenCalled();
    expect(ProfileViewMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ handle: 'alice' }),
    );
  });

  it('keys ProfileView by handle so it remounts when the route param changes', () => {
    mockUseLocalSearchParams.mockReturnValue({ handle: 'bob' });

    render(<ProfileScreen />);

    const element = ProfileViewMock.mock.calls[0];
    // React stores the element key on the rendered element, not in props;
    // assert the handle is forwarded and the component mounted once.
    expect(ProfileViewMock).toHaveBeenCalledTimes(1);
    expect(element[0]).toEqual(expect.objectContaining({ handle: 'bob' }));
  });

  it('renders nothing when the handle param is missing', () => {
    mockUseLocalSearchParams.mockReturnValue({});

    const { toJSON } = render(<ProfileScreen />);

    expect(toJSON()).toBeNull();
    expect(ProfileViewMock).not.toHaveBeenCalled();
    expect(Stack.Screen).not.toHaveBeenCalled();
  });

  it('configures the native Stack header with the handle title', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    try {
      mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });
      render(<ProfileScreen />);

      expect(Stack.Screen).toHaveBeenCalledTimes(1);
      expect(Stack.Screen.mock.calls[0][0].options).toEqual(
        expect.objectContaining({
          headerShown: true,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
          headerTitle: '@alice',
        }),
      );
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(Platform, 'OS', originalDescriptor);
      }
    }
  });

  it('hides the Stack header on web (the sidebar layout owns nav there)', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    try {
      mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });
      render(<ProfileScreen />);

      expect(Stack.Screen.mock.calls[0][0].options).toEqual(
        expect.objectContaining({ headerShown: false }),
      );
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(Platform, 'OS', originalDescriptor);
      }
    }
  });
});
