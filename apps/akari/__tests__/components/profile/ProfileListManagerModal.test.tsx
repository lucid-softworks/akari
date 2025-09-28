import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ProfileListManagerModal } from '@/components/profile/ProfileListManagerModal';
import { useViewerLists } from '@/hooks/queries/useViewerLists';
import { useActorListMemberships } from '@/hooks/queries/useActorListMemberships';
import { useUpdateListMembership } from '@/hooks/mutations/useUpdateListMembership';
import { useToast } from '@/contexts/ToastContext';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/queries/useViewerLists');
jest.mock('@/hooks/queries/useActorListMemberships');
jest.mock('@/hooks/mutations/useUpdateListMembership');
jest.mock('@/contexts/ToastContext');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseViewerLists = useViewerLists as jest.Mock;
const mockUseActorListMemberships = useActorListMemberships as jest.Mock;
const mockUseUpdateListMembership = useUpdateListMembership as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ProfileListManagerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseViewerLists.mockReturnValue({
      data: { lists: [{ uri: 'at://list/1', name: 'Friends', description: 'Close friends' }] },
      isLoading: false,
      error: null,
    });
    mockUseActorListMemberships.mockReturnValue({
      data: { listUris: [], recordUrisByListUri: {} },
      isLoading: false,
      error: null,
    });
    mockUseUpdateListMembership.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    mockUseToast.mockReturnValue({ showToast: jest.fn(), hideToast: jest.fn() });
    mockUseThemeColor.mockImplementation((values, _role) => {
      if (values && typeof values.light === 'string') {
        return values.light;
      }
      return '#000000';
    });
  });

  it('adds membership when list not selected', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ uri: 'at://listitem/123' });
    mockUseUpdateListMembership.mockReturnValue({ mutateAsync, isPending: false });
    const showToast = jest.fn();
    mockUseToast.mockReturnValue({ showToast, hideToast: jest.fn() });

    const { getByText } = render(
      <ProfileListManagerModal
        visible
        onClose={jest.fn()}
        actorHandle="alice"
        actorDid="did:example:alice"
      />,
    );

    fireEvent.press(getByText('Friends'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        action: 'add',
        did: 'did:example:alice',
        listUri: 'at://list/1',
      });
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'profile.addToLists', message: 'common.success' }),
    );
  });

  it('removes membership when list already selected', async () => {
    mockUseActorListMemberships.mockReturnValue({
      data: { listUris: ['at://list/1'], recordUrisByListUri: { 'at://list/1': 'at://listitem/123' } },
      isLoading: false,
      error: null,
    });
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseUpdateListMembership.mockReturnValue({ mutateAsync, isPending: false });

    const showToast = jest.fn();
    mockUseToast.mockReturnValue({ showToast, hideToast: jest.fn() });

    const { getByText } = render(
      <ProfileListManagerModal
        visible
        onClose={jest.fn()}
        actorHandle="alice"
        actorDid="did:example:alice"
      />,
    );

    fireEvent.press(getByText('Friends'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        action: 'remove',
        did: 'did:example:alice',
        listItemUri: 'at://listitem/123',
        listUri: 'at://list/1',
      });
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'profile.addToLists', message: 'common.success' }),
    );
  });
});
