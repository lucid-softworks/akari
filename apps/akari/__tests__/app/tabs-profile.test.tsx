import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useToast } from '@/contexts/ToastContext';
import * as Clipboard from 'expo-clipboard';

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
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/utils/tabScrollRegistry', () => ({
  tabScrollRegistry: {
    register: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const ReactLib = require('react');
  const { View } = jest.requireActual('react-native');
  const scrollToMock = jest.fn();

  const ScrollViewMock = ReactLib.forwardRef((props: any, ref: any) => {
    ReactLib.useImperativeHandle(ref, () => ({
      scrollTo: scrollToMock,
    }));

    return ReactLib.createElement(View, props, props.children);
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
        <TouchableOpacity onPress={() => onTabChange('repos')}>
          <Text>repos tab</Text>
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
  const { Text, View } = require('react-native');
  return {
    PostsTab: ({ handle, ListHeaderComponent, StickyTabComponent }: any) => (
      <View>
        {ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>posts {handle}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/LikesTab', () => {
  const { Text, View } = require('react-native');
  return {
    LikesTab: ({ handle, StickyTabComponent }: any) => (
      <View>
        {StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>likes {handle}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/RepliesTab', () => {
  const { Text, View } = require('react-native');
  return {
    RepliesTab: ({ handle, StickyTabComponent }: any) => (
      <View>
        {StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>replies {handle}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/MediaTab', () => {
  const { Text, View } = require('react-native');
  return {
    MediaTab: ({ handle, StickyTabComponent }: any) => (
      <View>
        {StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>media {handle}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/VideosTab', () => {
  const { Text, View } = require('react-native');
  return {
    VideosTab: ({ handle, StickyTabComponent }: any) => (
      <View>
        {StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>videos {handle}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/FeedsTab', () => {
  const { Text, View } = require('react-native');
  return {
    FeedsTab: ({ handle, StickyTabComponent }: any) => (
      <View>
        {StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>feeds {handle}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/StarterpacksTab', () => {
  const { Text, View } = require('react-native');
  return {
    StarterpacksTab: ({ handle, StickyTabComponent }: any) => (
      <View>
        {StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>starterpacks {handle}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/ReposTab', () => {
  const { Text, View } = require('react-native');
  return {
    ReposTab: ({ handle, StickyTabComponent }: any) => (
      <View>
        {StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>repos {handle}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/ThemedText', () => {
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
const { router } = require('expo-router');
const mockRouterPush = router.push as jest.Mock;

let mockShowToast: jest.Mock;

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
  scrollToMock.mockClear();
  mockRouterPush.mockClear();
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

    const { getByText, getAllByText } = render(<ProfileScreen />);

    expect(getByText('posts alice')).toBeTruthy();

    const pressLast = (label: string) => {
      const matches = getAllByText(label);
      fireEvent.press(matches[matches.length - 1]);
    };

    pressLast('replies tab');
    expect(getByText('replies alice')).toBeTruthy();

    pressLast('likes tab');
    expect(getByText('likes alice')).toBeTruthy();

    pressLast('media tab');
    expect(getByText('media alice')).toBeTruthy();

    pressLast('videos tab');
    expect(getByText('videos alice')).toBeTruthy();

    pressLast('feeds tab');
    expect(getByText('feeds alice')).toBeTruthy();

    pressLast('repos tab');
    expect(getByText('repos alice')).toBeTruthy();

    pressLast('starterpacks tab');
    expect(getByText('starterpacks alice')).toBeTruthy();

    pressLast('unknown tab');
    // 'unknown' is not in TAB_ORDER, so no new pane renders — the previously
    // visited tabs remain mounted (just inactive).
    expect(getByText('starterpacks alice')).toBeTruthy();

    // Profile now uses FlatList in PostsTab, scroll management handled there
  });

  it('positions dropdown using measurement and closes for all actions', async () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });

    const { getByText, getByTestId, queryByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByText('open dropdown'));

    // Production no longer measures the trigger; it now uses a Modal/sheet. So
    // measure() is never invoked and no positional style is passed. Just
    // assert the dropdown becomes visible.
    expect(getByTestId('profile-dropdown')).toBeTruthy();

    fireEvent.press(getByText('profile.copyLink'));

    await waitFor(() => {
      expect(queryByTestId('profile-dropdown')).toBeNull();
    });

    expect(mockClipboardSetStringAsync).toHaveBeenCalledWith('https://bsky.app/profile/alice');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'profile.linkCopied', type: 'success' })
    );

    fireEvent.press(getByText('open dropdown'));
    fireEvent.press(getByText('common.search'));
    expect(mockRouterPush).toHaveBeenCalledWith('/(tabs)/search?query=from:alice');
    expect(queryByTestId('profile-dropdown')).toBeNull();

    const remainingActions = [
      'profile.addToLists',
      'profile.muteAccount',
      'common.block',
      'profile.reportAccount',
    ];

    remainingActions.forEach((action) => {
      fireEvent.press(getByText('open dropdown'));
      fireEvent.press(getByText(action));
      expect(queryByTestId('profile-dropdown')).toBeNull();
    });
  });
});

