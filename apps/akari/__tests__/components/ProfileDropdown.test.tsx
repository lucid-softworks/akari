import { fireEvent, render } from '@testing-library/react-native';

import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useTranslation } from '@/hooks/useTranslation';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useAppTheme, themes } from '@/theme';

jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/theme', () => {
  const actual = jest.requireActual('@/theme');
  return {
    ...actual,
    useAppTheme: jest.fn(),
  };
});

const mockUseTranslation = useTranslation as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseAppTheme = useAppTheme as jest.Mock;

describe('ProfileDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseAppTheme.mockReturnValue(themes.light);
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
