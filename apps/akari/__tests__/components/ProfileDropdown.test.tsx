import { fireEvent, render } from '@testing-library/react-native';

import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useThemeColor');

const mockUseTranslation = useTranslation as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;

const defaultProps = {
  isVisible: false,
  onDismiss: jest.fn(),
  onCopyLink: jest.fn(),
  onSearchPosts: jest.fn(),
  onAddToLists: jest.fn(),
  onMuteAccount: jest.fn(),
  onBlockPress: jest.fn(),
  onReportAccount: jest.fn(),
  isFollowing: false,
  isBlocking: false,
  isMuted: false,
  isOwnProfile: false,
};

describe('ProfileDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockUseThemeColor.mockReturnValue('#fff');
  });

  it('does not render content when not visible', () => {
    const { toJSON } = render(<ProfileDropdown {...defaultProps} />);
    expect(toJSON()).toBeNull();
  });

  it('handles option selection', () => {
    const onCopyLink = jest.fn();
    const { getByText } = render(
      <ProfileDropdown {...defaultProps} isVisible={true} onCopyLink={onCopyLink} />,
    );
    fireEvent.press(getByText('profile.copyLink'));
    expect(onCopyLink).toHaveBeenCalled();
  });
});
