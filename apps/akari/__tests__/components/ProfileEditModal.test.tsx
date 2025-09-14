import { fireEvent, render } from '@testing-library/react-native';

import { ProfileEditModal } from '@/components/ProfileEditModal';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColor } from '@/hooks/useThemeColor';
jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useThemeColor');

const mockUseTranslation = useTranslation as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ProfileEditModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockUseThemeColor.mockReturnValue('#fff');
  });

  it('handles image actions and submits trimmed profile data', () => {
    const onSave = jest.fn();
    const { getByPlaceholderText, getByText, getAllByRole } = render(
      <ProfileEditModal
        visible
        onClose={() => {}}
        onSave={onSave}
        profile={{
          displayName: 'John',
          description: 'Bio',
          avatar: 'avatar-url',
          banner: 'banner-url',
        }}
      />,
    );

    const buttons = getAllByRole('button');
    fireEvent.press(buttons[2]);
    fireEvent.press(buttons[3]);

    fireEvent.changeText(getByPlaceholderText('profile.displayNamePlaceholder'), ' New Name ');
    fireEvent.changeText(getByPlaceholderText('profile.descriptionPlaceholder'), ' New Bio ');

    fireEvent.press(getByText('common.save'));
    expect(onSave).toHaveBeenCalledWith({
      displayName: 'New Name',
      description: 'New Bio',
      avatar: 'avatar-url',
      banner: 'banner-url',
    });
  });

  it('cancels edits and resets form', () => {
    const onClose = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <ProfileEditModal
        visible
        onClose={onClose}
        onSave={() => {}}
        profile={{ displayName: 'John', description: 'Bio' }}
      />,
    );

    const nameInput = getByPlaceholderText('profile.displayNamePlaceholder');
    fireEvent.changeText(nameInput, 'Jane');
    expect(nameInput.props.value).toBe('Jane');

    fireEvent.press(getByText('common.cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(nameInput.props.value).toBe('John');
  });

  it('resets to empty values when profile fields are missing', () => {
    const onClose = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <ProfileEditModal visible onClose={onClose} onSave={() => {}} profile={{}} />,
    );

    const nameInput = getByPlaceholderText('profile.displayNamePlaceholder');
    fireEvent.changeText(nameInput, 'Temp');

    fireEvent.press(getByText('common.cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(nameInput.props.value).toBe('');
  });

  it('shows saving state when loading', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <ProfileEditModal visible onClose={() => {}} onSave={onSave} profile={{}} isLoading />,
    );

    fireEvent.press(getByText('common.saving'));
    expect(onSave).not.toHaveBeenCalled();
  });
});

