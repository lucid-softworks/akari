import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useOzoneTeam,
  useAddOzoneTeamMember,
  useUpdateOzoneTeamMember,
  useDeleteOzoneTeamMember,
} from '@/hooks/queries/useOzoneTeam';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';
import { apiForAccount } from '@/utils/blueskyApi';
import { fetchProfilesByDid } from '@/utils/ozoneAvatars';

const mockListTeamMembers = jest.fn();
const mockAddTeamMember = jest.fn();
const mockUpdateTeamMember = jest.fn();
const mockDeleteTeamMember = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyOzone', () => ({ ozoneForAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));
jest.mock('@/utils/ozoneAvatars', () => ({ fetchProfilesByDid: jest.fn() }));

describe('useOzoneTeam hooks', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper, invalidateSpy };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    (useOzoneDid as jest.Mock).mockReturnValue('did:ozone');
    (ozoneForAccount as jest.Mock).mockReturnValue({
      listTeamMembers: mockListTeamMembers,
      addTeamMember: mockAddTeamMember,
      updateTeamMember: mockUpdateTeamMember,
      deleteTeamMember: mockDeleteTeamMember,
    });
    (apiForAccount as jest.Mock).mockReturnValue({});
    (fetchProfilesByDid as jest.Mock).mockResolvedValue(new Map());
  });

  it('lists team members and merges fetched profiles', async () => {
    mockListTeamMembers.mockResolvedValue({
      members: [
        { did: 'did:a', profile: { handle: 'old' } },
        { did: 'did:b', profile: {} },
      ],
    });
    (fetchProfilesByDid as jest.Mock).mockResolvedValue(
      new Map([['did:a', { handle: 'new', avatar: 'av' }]]),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneTeam(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListTeamMembers).toHaveBeenCalledWith('token', 'did:ozone', { limit: 100 });
    expect(fetchProfilesByDid).toHaveBeenCalledWith(expect.anything(), 'token', ['did:a', 'did:b']);
    expect(result.current.data).toEqual([
      { did: 'did:a', profile: { handle: 'new', avatar: 'av' } },
      { did: 'did:b', profile: {} },
    ]);
  });

  it('falls back to raw members when profile enrichment throws', async () => {
    mockListTeamMembers.mockResolvedValue({ members: [{ did: 'did:a' }] });
    (fetchProfilesByDid as jest.Mock).mockRejectedValue(new Error('boom'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneTeam(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ did: 'did:a' }]);
  });

  it('is disabled when ozoneDid missing', () => {
    (useOzoneDid as jest.Mock).mockReturnValue('');
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneTeam(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useAddOzoneTeamMember calls API and invalidates', async () => {
    mockAddTeamMember.mockResolvedValue({});
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAddOzoneTeamMember(), { wrapper });

    result.current.mutate({ did: 'did:new', role: 'moderator' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAddTeamMember).toHaveBeenCalledWith('token', 'did:ozone', {
      did: 'did:new',
      role: 'moderator',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['ozone', 'teamMembers', 'did:ozone'],
    });
  });

  it('useAddOzoneTeamMember throws when session missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAddOzoneTeamMember(), { wrapper });
    result.current.mutate({ did: 'did:new', role: 'moderator' });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useUpdateOzoneTeamMember calls API and invalidates', async () => {
    mockUpdateTeamMember.mockResolvedValue({});
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useUpdateOzoneTeamMember(), { wrapper });

    result.current.mutate({ did: 'did:x', role: 'admin', disabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateTeamMember).toHaveBeenCalledWith('token', 'did:ozone', {
      did: 'did:x',
      role: 'admin',
      disabled: true,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['ozone', 'teamMembers', 'did:ozone'],
    });
  });

  it('useUpdateOzoneTeamMember throws when PDS missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: undefined } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateOzoneTeamMember(), { wrapper });
    result.current.mutate({ did: 'did:x' });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('useDeleteOzoneTeamMember calls API, returns did, and invalidates', async () => {
    mockDeleteTeamMember.mockResolvedValue(undefined);
    const { wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useDeleteOzoneTeamMember(), { wrapper });

    result.current.mutate('did:gone');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteTeamMember).toHaveBeenCalledWith('token', 'did:ozone', 'did:gone');
    expect(result.current.data).toBe('did:gone');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['ozone', 'teamMembers', 'did:ozone'],
    });
  });

  it('useDeleteOzoneTeamMember throws when session missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteOzoneTeamMember(), { wrapper });
    result.current.mutate('did:gone');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
