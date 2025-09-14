import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

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
    expect(router.push).toHaveBeenCalledWith('/(tabs)/search?query=from:alice');
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
});
