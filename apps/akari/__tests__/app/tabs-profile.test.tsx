import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBorderColor } from '@/hooks/useBorderColor';

jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/queries/useProfile');
jest.mock('@/hooks/useTranslation');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useBorderColor');

jest.mock('@/components/ProfileHeader', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    ProfileHeader: ({ onDropdownToggle }: any) => (
      <TouchableOpacity onPress={() => onDropdownToggle(true)}>
        <Text>open dropdown</Text>
      </TouchableOpacity>
    ),
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
        <TouchableOpacity onPress={() => onTabChange('likes')}>
          <Text>likes tab</Text>
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

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  mockUseSafeAreaInsets.mockReturnValue({ top: 0 });
  mockUseProfile.mockReturnValue({ data: {} });
  mockUseThemeColor.mockReturnValue('#fff');
  mockUseBorderColor.mockReturnValue('#ccc');
});

describe('ProfileScreen', () => {
  it('shows loading state when handle is missing', () => {
    mockUseCurrentAccount.mockReturnValue({ data: {} });
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('common.loading')).toBeTruthy();
  });

  it('renders posts tab when handle is present', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('posts alice')).toBeTruthy();
  });

  it('closes dropdown after selecting actions', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });
    const { getByText, queryByText } = render(<ProfileScreen />);

    expect(queryByText('profile.copyLink')).toBeNull();

    fireEvent.press(getByText('open dropdown'));

    fireEvent.press(getByText('profile.copyLink'));
    expect(queryByText('profile.copyLink')).toBeNull();

    fireEvent.press(getByText('open dropdown'));

    fireEvent.press(getByText('common.search'));
    expect(queryByText('common.search')).toBeNull();
  });
});

