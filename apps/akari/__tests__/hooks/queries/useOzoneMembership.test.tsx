import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useOzoneMembership } from '@/hooks/queries/useOzoneMembership';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';

const mockListTeamMembers = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyOzone', () => ({ ozoneForAccount: jest.fn() }));
jest.mock('bluesky-ozone', () => ({
  OZONE_MOD_ROLES: ['tools.ozone.team.defs#roleModerator', 'tools.ozone.team.defs#roleAdmin'],
}));

describe('useOzoneMembership query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
    (useOzoneDid as jest.Mock).mockReturnValue('did:ozone');
    (ozoneForAccount as jest.Mock).mockReturnValue({ listTeamMembers: mockListTeamMembers });
  });

  it('resolves membership as a moderator when the viewer holds a mod role', async () => {
    const self = {
      did: 'did:me',
      role: 'tools.ozone.team.defs#roleModerator',
      disabled: false,
    };
    mockListTeamMembers.mockResolvedValue({ members: [self, { did: 'did:other' }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useOzoneMembership(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockListTeamMembers).toHaveBeenCalledWith('token', 'did:ozone', {
      q: 'did:me',
      limit: 25,
    });
    expect(result.current.data).toEqual({
      isMod: true,
      role: 'tools.ozone.team.defs#roleModerator',
      self,
    });
  });

  it('is not a mod when the matching member has a disabled flag', async () => {
    const self = {
      did: 'did:me',
      role: 'tools.ozone.team.defs#roleModerator',
      disabled: true,
    };
    mockListTeamMembers.mockResolvedValue({ members: [self] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useOzoneMembership(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.isMod).toBe(false);
  });

  it('is not a mod when the role is not a moderation role', async () => {
    const self = { did: 'did:me', role: 'tools.ozone.team.defs#roleVerifier' };
    mockListTeamMembers.mockResolvedValue({ members: [self] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useOzoneMembership(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({
      isMod: false,
      role: 'tools.ozone.team.defs#roleVerifier',
      self,
    });
  });

  it('honors an ozoneDidOverride', async () => {
    mockListTeamMembers.mockResolvedValue({ members: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useOzoneMembership({ ozoneDidOverride: 'did:override' }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockListTeamMembers).toHaveBeenCalledWith('token', 'did:override', {
      q: 'did:me',
      limit: 25,
    });
  });

  it('is disabled when enabled is false', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useOzoneMembership({ enabled: false }), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListTeamMembers).not.toHaveBeenCalled();
  });

  it('is disabled when the token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useOzoneMembership(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListTeamMembers).not.toHaveBeenCalled();
  });
});
