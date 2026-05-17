import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import ProfileScreen from '@/app/(tabs)/profile/[handle]';
import { useLocalSearchParams } from 'expo-router';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import * as Clipboard from 'expo-clipboard';

jest.mock('expo-router', () => {
  const Screen = jest.fn(() => null);
  const Stack: any = jest.fn(({ children }: any) => <>{children}</>);
  Stack.Screen = Screen;
  return {
    useLocalSearchParams: jest.fn(),
    usePathname: jest.fn(() => '/profile/alice'),
    router: { push: jest.fn() },
    Stack,
  };
});

jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/queries/useProfile');
jest.mock('@/hooks/useTranslation');
jest.mock('@/contexts/ToastContext');
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));
jest.mock('@/components/ProfileHeader', () => {
  const { Text } = require('react-native');
  const mock = jest.fn(({ onDropdownToggle, dropdownRef }: any) => {
    dropdownRef.current = {
      measure: (cb: any) => cb(0, 0, 0, 0, 0, 0),
    };
    return (
      <Text accessibilityRole="button" onPress={() => onDropdownToggle(true)}>
        header
      </Text>
    );
  });
  return { ProfileHeader: mock };
});

jest.mock('@/components/ProfileTabs', () => {
  const { Text } = require('react-native');
  return {
    ProfileTabs: ({ onTabChange }: any) => (
      <>
        {['posts', 'replies', 'likes', 'media', 'videos', 'feeds', 'repos', 'starterpacks', 'unknown'].map(
          (tab) => (
            <Text key={tab} accessibilityRole="button" onPress={() => onTabChange(tab as any)}>
              {tab}
            </Text>
          ),
        )}
      </>
    ),
  };
});

jest.mock('@/components/ProfileDropdown', () => {
  const { Text, View } = require('react-native');
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
    }: any) =>
      isVisible ? (
        <View style={style}>
          <Text onPress={onCopyLink}>copy link</Text>
          <Text onPress={onSearchPosts}>search posts</Text>
          <Text onPress={onAddToLists}>add to lists</Text>
          <Text onPress={onMuteAccount}>mute account</Text>
          <Text onPress={onBlockPress}>block account</Text>
          <Text onPress={onReportAccount}>report account</Text>
        </View>
      ) : null,
  };
});

jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: (props: any) => <Text {...props} /> };
});

jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { ProfileHeaderSkeleton: () => <Text>skeleton</Text> };
});

jest.mock('@/components/profile/PostsTab', () => {
  const { Text, View } = require('react-native');
  return {
    PostsTab: ({ handle, StickyTabComponent, ListHeaderComponent, isActive }: any) => (
      <View>
        {isActive && ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {isActive && StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>{`posts ${handle}`}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/RepliesTab', () => {
  const { Text, View } = require('react-native');
  return {
    RepliesTab: ({ handle, StickyTabComponent, ListHeaderComponent, isActive }: any) => (
      <View>
        {isActive && ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {isActive && StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>{`replies ${handle}`}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/LikesTab', () => {
  const { Text, View } = require('react-native');
  return {
    LikesTab: ({ handle, StickyTabComponent, ListHeaderComponent, isActive }: any) => (
      <View>
        {isActive && ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {isActive && StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>{`likes ${handle}`}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/MediaTab', () => {
  const { Text, View } = require('react-native');
  return {
    MediaTab: ({ handle, StickyTabComponent, ListHeaderComponent, isActive }: any) => (
      <View>
        {isActive && ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {isActive && StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>{`media ${handle}`}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/VideosTab', () => {
  const { Text, View } = require('react-native');
  return {
    VideosTab: ({ handle, StickyTabComponent, ListHeaderComponent, isActive }: any) => (
      <View>
        {isActive && ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {isActive && StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>{`videos ${handle}`}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/FeedsTab', () => {
  const { Text, View } = require('react-native');
  return {
    FeedsTab: ({ handle, StickyTabComponent, ListHeaderComponent, isActive }: any) => (
      <View>
        {isActive && ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {isActive && StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>{`feeds ${handle}`}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/StarterpacksTab', () => {
  const { Text, View } = require('react-native');
  return {
    StarterpacksTab: ({ handle, StickyTabComponent, ListHeaderComponent, isActive }: any) => (
      <View>
        {isActive && ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {isActive && StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>{`starterpacks ${handle}`}</Text>
      </View>
    ),
  };
});

jest.mock('@/components/profile/ReposTab', () => {
  const { Text, View } = require('react-native');
  return {
    ReposTab: ({ handle, StickyTabComponent, ListHeaderComponent, isActive }: any) => (
      <View>
        {isActive && ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        {isActive && StickyTabComponent ? (typeof StickyTabComponent === 'function' ? <StickyTabComponent /> : StickyTabComponent) : null}
        <Text>{`repos ${handle}`}</Text>
      </View>
    ),
  };
});

const { ProfileHeader: ProfileHeaderMock } = require('@/components/ProfileHeader');

const { router } = require('expo-router');
const mockRouterPush = router.push as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockClipboardSetStringAsync = Clipboard.setStringAsync as jest.Mock;

let mockShowToast: jest.Mock;

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush.mockClear();
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });
    mockClipboardSetStringAsync.mockResolvedValue(undefined);
    mockShowToast = jest.fn();
    mockUseToast.mockReturnValue({ showToast: mockShowToast, hideToast: jest.fn() });
  });

  it('shows skeleton while loading', () => {
    mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });
    mockUseProfile.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { getByText } = render(<ProfileScreen />);
    expect(getByText('skeleton')).toBeTruthy();
  });

  it('shows error when profile not found', () => {
    mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });
    mockUseProfile.mockReturnValue({ data: undefined, isLoading: false, error: new Error('x') });

    const { getByText } = render(<ProfileScreen />);
    expect(getByText('common.noProfile')).toBeTruthy();
  });

  it('shows error when profile data is missing', () => {
    mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });
    mockUseProfile.mockReturnValue({ data: undefined, isLoading: false, error: null });

    const { getByText } = render(<ProfileScreen />);
    expect(getByText('common.noProfile')).toBeTruthy();
  });

  it('renders profile, switches tabs and handles dropdown actions', async () => {
    mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });
    mockUseProfile.mockReturnValue({
      data: {
        handle: 'alice',
        avatar: null,
        displayName: 'Alice',
        description: '',
        banner: null,
        did: 'did',
        followersCount: 1,
        followsCount: 1,
        postsCount: 1,
        // ProfileView short-circuits to a "blocked" view when viewer.blocking
        // or viewer.blockedBy is set, so leave them off here.
        viewer: { following: true, muted: true },
        labels: [],
      },
      isLoading: false,
      error: null,
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { getByText, queryByText } = render(<ProfileScreen />);

    expect(getByText('posts alice')).toBeTruthy();

    fireEvent.press(getByText('likes'));
    expect(getByText('likes alice')).toBeTruthy();
    fireEvent.press(getByText('replies'));
    expect(getByText('replies alice')).toBeTruthy();
    fireEvent.press(getByText('media'));
    expect(getByText('media alice')).toBeTruthy();
    fireEvent.press(getByText('videos'));
    expect(getByText('videos alice')).toBeTruthy();
    fireEvent.press(getByText('feeds'));
    expect(getByText('feeds alice')).toBeTruthy();
    fireEvent.press(getByText('repos'));
    expect(getByText('repos alice')).toBeTruthy();
    fireEvent.press(getByText('starterpacks'));
    expect(getByText('starterpacks alice')).toBeTruthy();
    // Pressing an unknown tab name doesn't create new content (it's not in
    // TAB_ORDER), so just verify nothing rendered for it.
    expect(queryByText('unknown alice')).toBeNull();

    fireEvent.press(getByText('header'));
    const dropdownItem = getByText('copy link');
    fireEvent.press(dropdownItem);

    await waitFor(() => expect(queryByText('copy link')).toBeNull());
    expect(mockClipboardSetStringAsync).toHaveBeenCalledWith('https://bsky.app/profile/alice');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'profile.linkCopied', type: 'success' })
    );

    fireEvent.press(getByText('header'));
    fireEvent.press(getByText('search posts'));
    expect(mockRouterPush).toHaveBeenCalledWith('/(tabs)/search?query=from:alice');

    // These actions are placeholders (TODO stubs), verify they don't crash
    fireEvent.press(getByText('header'));
    fireEvent.press(getByText('add to lists'));

    fireEvent.press(getByText('header'));
    fireEvent.press(getByText('mute account'));

    fireEvent.press(getByText('header'));
    fireEvent.press(getByText('block account'));

    fireEvent.press(getByText('header'));
    fireEvent.press(getByText('report account'));

    logSpy.mockRestore();
  });

  it('toggles dropdown visibility when closing', () => {
    mockUseLocalSearchParams.mockReturnValue({ handle: 'alice' });
    mockUseProfile.mockReturnValue({
      data: {
        handle: 'alice',
        avatar: null,
        displayName: 'Alice',
        description: '',
        banner: null,
        did: 'did',
        followersCount: 1,
        followsCount: 1,
        postsCount: 1,
        viewer: {},
        labels: [],
      },
      isLoading: false,
      error: null,
    });

    const { queryByText } = render(<ProfileScreen />);
    const headerInstance = (ProfileHeaderMock as jest.Mock).mock.calls[0][0];
    act(() => headerInstance.onDropdownToggle(true));
    expect(queryByText('copy link')).not.toBeNull();
    act(() => headerInstance.onDropdownToggle(false));
    expect(queryByText('copy link')).toBeNull();
  });

  it('returns no tab content when handle missing', () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseProfile.mockReturnValue({
      data: {
        handle: 'bob',
        avatar: null,
        displayName: 'Bob',
        description: '',
        banner: null,
        did: 'did',
        followersCount: 0,
        followsCount: 0,
        postsCount: 0,
        viewer: {},
        labels: [],
      },
      isLoading: false,
      error: null,
    });

    const { queryByText } = render(<ProfileScreen />);
    expect(queryByText('posts undefined')).toBeNull();
  });
});

