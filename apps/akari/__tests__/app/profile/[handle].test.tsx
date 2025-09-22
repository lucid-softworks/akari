import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import ProfileScreen from '@/app/profile/[handle]';
import { useLocalSearchParams } from 'expo-router';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/queries/useProfile');
jest.mock('@/hooks/useTranslation');

jest.mock('@/components/ProfileHeader', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ProfileHeader: jest.fn(() => <Text>header</Text>) };
});

jest.mock('@/components/ProfileTabs', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ProfileTabs: ({ onTabChange }: any) => (
      <>
        {['posts', 'replies', 'likes', 'media', 'videos', 'feeds', 'starterpacks', 'unknown'].map(
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
  const { Text } = require('react-native');
  return { PostsTab: ({ handle }: any) => <Text>{`posts ${handle}`}</Text> };
});

jest.mock('@/components/profile/RepliesTab', () => {
  const { Text } = require('react-native');
  return { RepliesTab: ({ handle }: any) => <Text>{`replies ${handle}`}</Text> };
});

jest.mock('@/components/profile/LikesTab', () => {
  const { Text } = require('react-native');
  return { LikesTab: ({ handle }: any) => <Text>{`likes ${handle}`}</Text> };
});

jest.mock('@/components/profile/MediaTab', () => {
  const { Text } = require('react-native');
  return { MediaTab: ({ handle }: any) => <Text>{`media ${handle}`}</Text> };
});

jest.mock('@/components/profile/VideosTab', () => {
  const { Text } = require('react-native');
  return { VideosTab: ({ handle }: any) => <Text>{`videos ${handle}`}</Text> };
});

jest.mock('@/components/profile/FeedsTab', () => {
  const { Text } = require('react-native');
  return { FeedsTab: ({ handle }: any) => <Text>{`feeds ${handle}`}</Text> };
});

jest.mock('@/components/profile/StarterpacksTab', () => {
  const { Text } = require('react-native');
  return { StarterpacksTab: ({ handle }: any) => <Text>{`starterpacks ${handle}`}</Text> };
});

const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (k: string) => k });
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });
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

  it('renders profile and switches tabs', () => {
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
        viewer: { following: true, blocking: true, muted: true },
        labels: [],
      },
      isLoading: false,
      error: null,
    });

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
    fireEvent.press(getByText('starterpacks'));
    expect(getByText('starterpacks alice')).toBeTruthy();
    fireEvent.press(getByText('unknown'));
    expect(queryByText('unknown alice')).toBeNull();
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

