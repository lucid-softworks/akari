import { fireEvent, render } from '@testing-library/react-native';

import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBorderColor } from '@/hooks/useBorderColor';

jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useBorderColor');

const mockUseTranslation = useTranslation as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;

describe('ProfileDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockUseThemeColor.mockReturnValue('#fff');
    mockUseBorderColor.mockReturnValue('#ccc');
  });

  it('does not render when not visible', () => {
    const { toJSON } = render(
      <ProfileDropdown
        isVisible={false}
        onCopyLink={() => {}}
        onSearchPosts={() => {}}
        onAddToLists={() => {}}
        onMuteAccount={() => {}}
        onBlockPress={() => {}}
        onReportAccount={() => {}}
        isFollowing={false}
        isBlocking={false}
        isMuted={false}
        isOwnProfile={false}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('handles option selection', () => {
    const onCopyLink = jest.fn();
    const { getByText } = render(
      <ProfileDropdown
        isVisible={true}
        onCopyLink={onCopyLink}
        onSearchPosts={() => {}}
        onAddToLists={() => {}}
        onMuteAccount={() => {}}
        onBlockPress={() => {}}
        onReportAccount={() => {}}
        isFollowing={false}
        isBlocking={false}
        isMuted={false}
        isOwnProfile={false}
      />,
    );
    fireEvent.press(getByText('profile.copyLink'));
    expect(onCopyLink).toHaveBeenCalled();
  });
});
