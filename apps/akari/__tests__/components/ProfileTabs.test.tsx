import { fireEvent, render } from '@testing-library/react-native';

import { ProfileTabs } from '@/components/ProfileTabs';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useTranslation } from '@/hooks/useTranslation';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/queries/useCurrentAccount');
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');

const mockUseCurrentAccount = useCurrentAccount as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ProfileTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({
      t: (key: string) => {
        const map: Record<string, string> = {
          'common.posts': 'Posts',
          'common.replies': 'Replies',
          'profile.media': 'Media',
          'common.likes': 'Likes',
          'profile.videos': 'Videos',
          'profile.feeds': 'Feeds',
          'profile.repos': 'Repos',
          'profile.starterpacks': 'Starterpacks',
        };
        return map[key] ?? key;
      },
    });
  });

  it('includes likes tab for own profile', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });

    const { getByText } = render(
      <ProfileTabs
        activeTab="posts"
        onTabChange={() => {}}
        profileHandle="alice"
      />,
    );

    const labels = [
      'Posts',
      'Replies',
      'Media',
      'Likes',
      'Videos',
      'Feeds',
      'Repos',
      'Starterpacks',
    ];

    for (const label of labels) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('excludes likes tab for other profiles', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });

    const { getByText, queryByText } = render(
      <ProfileTabs
        activeTab="posts"
        onTabChange={() => {}}
        profileHandle="bob"
      />,
    );

    const labels = ['Posts', 'Replies', 'Media', 'Videos', 'Feeds', 'Repos', 'Starterpacks'];

    for (const label of labels) {
      expect(getByText(label)).toBeTruthy();
    }

    expect(queryByText('Likes')).toBeNull();
  });

  it('triggers onTabChange when a tab is pressed', () => {
    mockUseCurrentAccount.mockReturnValue({ data: { handle: 'alice' } });
    const onTabChange = jest.fn();

    const { getByText } = render(
      <ProfileTabs
        activeTab="posts"
        onTabChange={onTabChange}
        profileHandle="alice"
      />,
    );

    fireEvent.press(getByText('Media'));

    expect(onTabChange).toHaveBeenCalledWith('media');
  });
});

