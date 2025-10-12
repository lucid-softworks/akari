import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import { ProfileHeader } from '@/components/ProfileHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useUpdateProfile } from '@/hooks/mutations/useUpdateProfile';
import { router } from 'expo-router';
import { HandleHistoryModal } from '@/components/HandleHistoryModal';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { showAlert } from '@/utils/alert';

jest.mock('@/hooks/useTranslation');
jest.mock('@/contexts/LanguageContext');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/mutations/useFollowUser');
jest.mock('@/hooks/mutations/useBlockUser');
jest.mock('@/hooks/mutations/useUpdateProfile');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));
jest.mock('@/components/Labels', () => ({ Labels: jest.fn(() => null) }));
jest.mock('@/components/RichText', () => ({ RichText: jest.fn(() => null) }));
jest.mock('@/components/HandleHistoryModal', () => ({ HandleHistoryModal: jest.fn(() => null) }));
jest.mock('@/components/ProfileEditModal', () => ({ ProfileEditModal: jest.fn(() => null) }));
jest.mock('@/utils/alert', () => ({ showAlert: jest.fn() }));
jest.mock('@/components/ui/IconSymbol', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const mockUseTranslation = useTranslation as jest.Mock;
const mockUseLanguage = useLanguage as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseFollowUser = useFollowUser as jest.Mock;
const mockUseBlockUser = useBlockUser as jest.Mock;
const mockUseUpdateProfile = useUpdateProfile as jest.Mock;
const mockHandleHistoryModal = HandleHistoryModal as jest.Mock;
const mockProfileEditModal = ProfileEditModal as jest.Mock;
const mockShowAlert = showAlert as jest.Mock;

const baseProfile = {
  handle: 'alice',
  did: 'did:alice',
  followersCount: 0,
  followsCount: 0,
  postsCount: 0,
};

describe('ProfileHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockUseLanguage.mockReturnValue({ currentLocale: 'en-US' });
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseFollowUser.mockReturnValue({ mutateAsync: jest.fn() });
    mockUseBlockUser.mockReturnValue({ mutateAsync: jest.fn() });
    mockUseUpdateProfile.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    mockShowAlert.mockReset();
  });

  it('opens handle history modal when handle is pressed', () => {
    const { getByText } = render(<ProfileHeader profile={baseProfile} />);
    fireEvent.press(getByText(/@alice/));
    expect(mockHandleHistoryModal.mock.calls[1][0].visible).toBe(true);
  });

  it('shows edit profile modal for own profile', () => {
    const { getByText } = render(<ProfileHeader profile={baseProfile} isOwnProfile />);
    fireEvent.press(getByText(/profile.editProfile/));
    expect(mockProfileEditModal.mock.calls[1][0].visible).toBe(true);
  });

  it('searches posts when search button pressed', () => {
    const { getByText } = render(<ProfileHeader profile={baseProfile} />);
    fireEvent.press(getByText(/magnifyingglass/));
    expect(router.push).toHaveBeenCalledWith('/(search)?query=from:alice');
  });

  it('renders banner, avatar, description and blocked message', () => {
    render(
      <ProfileHeader
        profile={{
          ...baseProfile,
          banner: 'b.jpg',
          avatar: 'a.jpg',
          description: 'desc',
          viewer: { blockedBy: true },
        }}
      />,
    );
  });

  it('falls back to displayName and U when avatar missing', () => {
    render(
      <ProfileHeader
        profile={{ ...baseProfile, displayName: 'Alice Name', avatar: undefined }}
      />,
    );
    render(
      <ProfileHeader
        profile={{ handle: '', followersCount: 0, followsCount: 0, postsCount: 0 }}
      />,
    );
  });

  it('toggles dropdown when more button pressed', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <ProfileHeader profile={baseProfile} onDropdownToggle={onToggle} />,
    );
    fireEvent.press(getByText(/ellipsis/));
    expect(onToggle).toHaveBeenCalledWith(true);
    fireEvent.press(getByText(/ellipsis/));
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });


  it('saves profile and handles errors', async () => {
    const updateMutate = jest.fn().mockResolvedValue(undefined);
    mockUseUpdateProfile.mockReturnValue({ mutateAsync: updateMutate, isPending: false });
    render(<ProfileHeader profile={baseProfile} />);
    const save = mockProfileEditModal.mock.calls[0][0].onSave;
    await act(async () => {
      await save({ displayName: 'Alice', description: 'bio' });
    });
    expect(updateMutate).toHaveBeenCalledWith({ displayName: 'Alice', description: 'bio' });
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'common.success' }),
    );
    mockShowAlert.mockClear();
    updateMutate.mockRejectedValueOnce(new Error('err'));
    await act(async () => {
      await save({ displayName: 'Alice', description: 'bio' });
    });
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'common.error' }),
    );
  });

  it('calls modal close handlers', () => {
    render(<ProfileHeader profile={baseProfile} />);
    mockHandleHistoryModal.mock.calls[0][0].onClose();
    mockProfileEditModal.mock.calls[0][0].onClose();
  });
});
