import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBorderColor } from '@/hooks/useBorderColor';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { useToast } from '@/contexts/ToastContext';
import * as Clipboard from 'expo-clipboard';
import { useBlockUserHandler } from '@/hooks/useBlockUserHandler';

let mockLatestDropdownMeasure: jest.Mock | null = null;

jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/queries/useProfile');
jest.mock('@/hooks/useTranslation');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/contexts/ToastContext');
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));
jest.mock('@/hooks/useBlockUserHandler');

jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: {
    register: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const { View } = jest.requireActual('react-native');
  const scrollToMock = jest.fn();

  const ScrollViewMock = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      scrollTo: scrollToMock,
    }));

    return (
      <View {...props}>
        {props.children}
      </View>
    );
  });

  return {
    __esModule: true,
    default: ScrollViewMock,
    ScrollView: ScrollViewMock,
    scrollToMock,
  };
});

const { scrollToMock } = require('react-native/Libraries/Components/ScrollView/ScrollView') as {
  scrollToMock: jest.Mock;
};

jest.mock('@/components/ProfileHeader', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    ProfileHeader: ({ onDropdownToggle, dropdownRef }: any) => {
      if (dropdownRef && !dropdownRef.current) {
        mockLatestDropdownMeasure = jest.fn((callback: any) => callback(0, 0, 0, 40, 0, 100));
        dropdownRef.current = {
          measure: mockLatestDropdownMeasure,
        };
      }

      return (
        <TouchableOpacity onPress={() => onDropdownToggle(true)}>
          <Text>open dropdown</Text>
        </TouchableOpacity>
      );
    },
  };
});

jest.mock('@/components/ProfileDropdown', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    ProfileDropdown: ({
      isVisible,
      onCopyLink,
      onSearchPosts,
      onAddToLists,
      onMuteAccount,
      onBlockPress,
      onReportAccount,
      style,
    }: any) => {
      if (!isVisible) return null;

      return (
        <View testID="profile-dropdown" style={style}>
          <TouchableOpacity onPress={onCopyLink}>
            <Text>profile.copyLink</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSearchPosts}>
            <Text>common.search</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAddToLists}>
            <Text>profile.addToLists</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onMuteAccount}>
            <Text>profile.muteAccount</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBlockPress}>
            <Text>common.block</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReportAccount}>
            <Text>profile.reportAccount</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

jest.mock('@/components/ProfileTabs', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    ProfileTabs: ({ onTabChange }: any) => (
      <View>
        <TouchableOpacity onPress={() => onTabChange('posts')}>
          <Text>posts tab</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('replies')}>
          <Text>replies tab</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('likes')}>
          <Text>likes tab</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('media')}>
          <Text>media tab</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('videos')}>
          <Text>videos tab</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('feeds')}>
          <Text>feeds tab</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('starterpacks')}>
          <Text>starterpacks tab</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabChange('unknown' as any)}>
          <Text>unknown tab</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('@/components/profile/PostsTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { PostsTab: ({ handle }: any) => <Text>posts {handle}</Text> };
});

jest.mock('@/components/profile/LikesTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { LikesTab: ({ handle }: any) => <Text>likes {handle}</Text> };
});

jest.mock('@/components/profile/RepliesTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { RepliesTab: ({ handle }: any) => <Text>replies {handle}</Text> };
});

jest.mock('@/components/profile/MediaTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { MediaTab: ({ handle }: any) => <Text>media {handle}</Text> };
});

jest.mock('@/components/profile/VideosTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { VideosTab: ({ handle }: any) => <Text>videos {handle}</Text> };
});

jest.mock('@/components/profile/FeedsTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FeedsTab: ({ handle }: any) => <Text>feeds {handle}</Text> };
});

jest.mock('@/components/profile/StarterpacksTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { StarterpacksTab: ({ handle }: any) => <Text>starterpacks {handle}</Text> };
});

jest.mock('@/components/ThemedView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ThemedText: ({ children, ...props }: any) => <Text {...props}>{children}</Text> };
});

const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseSafeAreaInsets = useSafeAreaInsets as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockClipboardSetStringAsync = Clipboard.setStringAsync as jest.Mock;
const mockRegister = tabScrollRegistry.register as jest.Mock;
const mockUseBlockUserHandler = useBlockUserHandler as jest.Mock;

let mockShowToast: jest.Mock;
let mockHandleBlockPress: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockLatestDropdownMeasure = null;
  mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  mockUseSafeAreaInsets.mockReturnValue({ top: 0 });
  mockUseProfile.mockReturnValue({ data: {} });
  mockUseThemeColor.mockReturnValue('#fff');
  mockUseBorderColor.mockReturnValue('#ccc');
  mockClipboardSetStringAsync.mockResolvedValue(undefined);
  mockShowToast = jest.fn();
  mockUseToast.mockReturnValue({ showToast: mockShowToast, hideToast: jest.fn() });
  mockHandleBlockPress = jest.fn((params?: { onSuccess?: () => void }) => params?.onSuccess?.());
  mockUseBlockUserHandler.mockReturnValue({ handleBlockPress: mockHandleBlockPress });
  scrollToMock.mockClear();
});

describe('ProfileScreen', () => {
  it('shows loading state when handle is missing', () => {
    mockUseCurrentAccount.mockReturnValue({ data: {} });
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('common.loading')).toBeTruthy();
  });

  it('renders all tab content and registers scroll handler', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });
    mockUseProfile.mockReturnValue({ data: { displayName: 'Alice' } });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('posts alice')).toBeTruthy();

    fireEvent.press(getByText('replies tab'));
    expect(getByText('replies alice')).toBeTruthy();

    fireEvent.press(getByText('likes tab'));
    expect(getByText('likes alice')).toBeTruthy();

    fireEvent.press(getByText('media tab'));
    expect(getByText('media alice')).toBeTruthy();

    fireEvent.press(getByText('videos tab'));
    expect(getByText('videos alice')).toBeTruthy();

    fireEvent.press(getByText('feeds tab'));
    expect(getByText('feeds alice')).toBeTruthy();

    fireEvent.press(getByText('starterpacks tab'));
    expect(getByText('starterpacks alice')).toBeTruthy();

    fireEvent.press(getByText('unknown tab'));
    expect(getByText('profile.noContent')).toBeTruthy();

    expect(scrollToMock).toHaveBeenCalled();

    expect(mockRegister).toHaveBeenCalledWith('profile', expect.any(Function));
    const [, scrollHandler] = mockRegister.mock.calls[0];
    scrollToMock.mockClear();
    scrollHandler();
    expect(scrollToMock).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('positions dropdown using measurement and closes for all actions', async () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });
    mockUseProfile.mockReturnValue({ data: { did: 'did:example:123', handle: 'alice', viewer: {} } });

    const { getByText, getByTestId, queryByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByText('open dropdown'));

    expect(mockLatestDropdownMeasure).toBeTruthy();
    expect(mockLatestDropdownMeasure).toHaveBeenCalled();

    const dropdown = getByTestId('profile-dropdown');
    expect(dropdown.props.style).toEqual(expect.objectContaining({ top: 144, right: 20 }));

    fireEvent.press(getByText('profile.copyLink'));

    await waitFor(() => {
      expect(queryByTestId('profile-dropdown')).toBeNull();
    });

    expect(mockClipboardSetStringAsync).toHaveBeenCalledWith('https://bsky.app/profile/alice');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'profile.linkCopied', type: 'success' })
    );

    const remainingActions = [
      'common.search',
      'profile.addToLists',
      'profile.muteAccount',
      'profile.reportAccount',
    ];

    remainingActions.forEach((action) => {
      fireEvent.press(getByText('open dropdown'));
      fireEvent.press(getByText(action));
      expect(queryByTestId('profile-dropdown')).toBeNull();
    });

    fireEvent.press(getByText('open dropdown'));
    fireEvent.press(getByText('common.block'));
    expect(mockHandleBlockPress).toHaveBeenCalledWith(
      expect.objectContaining({
        did: 'did:example:123',
        handle: 'alice',
        blockingUri: undefined,
      }),
    );
    expect(queryByTestId('profile-dropdown')).toBeNull();
  });
});

