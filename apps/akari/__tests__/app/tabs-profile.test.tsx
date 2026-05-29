import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/hooks/useConfirm';
import { searchProfilePosts } from '@/components/profile/profileActions';
import * as Clipboard from 'expo-clipboard';

jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/queries/useIsGuest');
jest.mock('@/hooks/queries/useProfile');
jest.mock('@/hooks/useTranslation');
jest.mock('@/contexts/ToastContext');
jest.mock('@/hooks/useConfirm');
jest.mock('@/components/profile/profileActions', () => ({
  searchProfilePosts: jest.fn(),
}));
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

// The profile dropdown is now a shared `Menu` rendered inside ProfileHeader,
// driven by the `menuItems` prop the screen builds. Mock ProfileHeader to
// surface each menu item as a pressable so we can exercise the actions.
jest.mock('@/components/ProfileHeader', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    ProfileHeader: ({ menuItems }: any) => (
      <View>
        {(menuItems ?? []).map((item: any) => (
          <TouchableOpacity key={item.key} onPress={item.onPress}>
            <Text>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

jest.mock('@/components/GuestSignInRequired', () => {
  const { Text } = require('react-native');
  return { GuestSignInRequired: ({ title }: any) => <Text>guest:{title}</Text> };
});

jest.mock('@/components/skeletons', () => {
  const { Text } = require('react-native');
  return { ProfileHeaderSkeleton: () => <Text>profile-skeleton</Text> };
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

const tabPaneMock = (name: string) => {
  const { Text, View } = require('react-native');
  return ({ handle, ListHeaderComponent, StickyTabComponent }: any) => (
    <View>
      {ListHeaderComponent ?? null}
      {StickyTabComponent ?? null}
      <Text>{`${name} ${handle}`}</Text>
    </View>
  );
};

jest.mock('@/components/profile/PostsTab', () => ({ PostsTab: tabPaneMock('posts') }));
jest.mock('@/components/profile/RepliesTab', () => ({ RepliesTab: tabPaneMock('replies') }));
jest.mock('@/components/profile/LikesTab', () => ({ LikesTab: tabPaneMock('likes') }));
jest.mock('@/components/profile/MediaTab', () => ({ MediaTab: tabPaneMock('media') }));
jest.mock('@/components/profile/VideosTab', () => ({ VideosTab: tabPaneMock('videos') }));
jest.mock('@/components/profile/FeedsTab', () => ({ FeedsTab: tabPaneMock('feeds') }));
jest.mock('@/components/profile/ReposTab', () => ({ ReposTab: tabPaneMock('repos') }));
jest.mock('@/components/profile/StarterpacksTab', () => ({ StarterpacksTab: tabPaneMock('starterpacks') }));
jest.mock('@/components/profile/RepostsTab', () => ({ RepostsTab: tabPaneMock('reposts') }));
jest.mock('@/components/profile/ResumeTab', () => ({ ResumeTab: tabPaneMock('resume') }));
jest.mock('@/components/profile/PhotosTab', () => ({ PhotosTab: tabPaneMock('photos') }));
jest.mock('@/components/profile/RpgItemsTab', () => ({ RpgItemsTab: tabPaneMock('rpgItems') }));
jest.mock('@/components/profile/RecipesTab', () => ({ RecipesTab: tabPaneMock('recipes') }));
jest.mock('@/components/profile/LinksTab', () => ({ LinksTab: tabPaneMock('links') }));

jest.mock('@/components/ThemedView', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children, ...props }: any) => <View {...props}>{children}</View> };
});

jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: ({ children, ...props }: any) => <Text {...props}>{children}</Text> };
});

const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseIsGuest = useIsGuest as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockUseConfirm = useConfirm as jest.Mock;
const mockSearchProfilePosts = searchProfilePosts as jest.Mock;
const mockClipboardSetStringAsync = Clipboard.setStringAsync as jest.Mock;

let mockShowToast: jest.Mock;
let mockConfirm: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  mockUseProfile.mockReturnValue({ data: undefined, isLoading: false, refetch: jest.fn() });
  mockUseIsGuest.mockReturnValue(false);
  mockClipboardSetStringAsync.mockResolvedValue(undefined);
  mockShowToast = jest.fn();
  mockUseToast.mockReturnValue({ showToast: mockShowToast, hideToast: jest.fn() });
  mockConfirm = jest.fn();
  mockUseConfirm.mockReturnValue(mockConfirm);
});

describe('ProfileScreen', () => {
  it('shows the sign-in CTA for guests', () => {
    mockUseIsGuest.mockReturnValue(true);
    mockUseCurrentAccount.mockReturnValue({ data: undefined, isLoading: false });
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('guest:common.profile')).toBeTruthy();
  });

  it('shows the skeleton while the account or profile is loading', () => {
    mockUseCurrentAccount.mockReturnValue({ data: undefined, isLoading: true });
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile-skeleton')).toBeTruthy();
  });

  it('shows the loading empty state when the handle is missing', () => {
    mockUseCurrentAccount.mockReturnValue({ data: {}, isLoading: false });
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('common.loading')).toBeTruthy();
  });

  it('renders all tab content when switching tabs', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' }, isLoading: false });
    mockUseProfile.mockReturnValue({ data: { displayName: 'Alice' }, isLoading: false, refetch: jest.fn() });

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
  });

  it('copies the profile link and shows a success toast from the overflow menu', async () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' }, isLoading: false });
    mockUseProfile.mockReturnValue({ data: { displayName: 'Alice' }, isLoading: false, refetch: jest.fn() });

    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('profile.copyLink'));

    await waitFor(() =>
      expect(mockClipboardSetStringAsync).toHaveBeenCalledWith('https://bsky.app/profile/alice'),
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'profile.linkCopied', type: 'success' }),
    );
  });

  it('triggers a profile post search from the overflow menu', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' }, isLoading: false });
    mockUseProfile.mockReturnValue({ data: { displayName: 'Alice' }, isLoading: false, refetch: jest.fn() });

    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('common.search'));

    expect(mockSearchProfilePosts).toHaveBeenCalledWith({ handle: 'alice' });
  });
});
