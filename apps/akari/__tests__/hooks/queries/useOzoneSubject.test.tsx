import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useOzoneSubjectStatus, useOzoneSubjectEvents } from '@/hooks/queries/useOzoneSubject';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';
import { apiForAccount } from '@/utils/blueskyApi';
import { fetchAvatarsByDid, subjectDid } from '@/utils/ozoneAvatars';

const mockQueryStatuses = jest.fn();
const mockQueryEvents = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyOzone', () => ({ ozoneForAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));
jest.mock('@/utils/ozoneAvatars', () => ({
  fetchAvatarsByDid: jest.fn(),
  subjectDid: jest.fn(),
}));

describe('useOzoneSubject hooks', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    (useOzoneDid as jest.Mock).mockReturnValue('did:ozone');
    (ozoneForAccount as jest.Mock).mockReturnValue({
      queryStatuses: mockQueryStatuses,
      queryEvents: mockQueryEvents,
    });
    (apiForAccount as jest.Mock).mockReturnValue({});
    (fetchAvatarsByDid as jest.Mock).mockResolvedValue(new Map());
    (subjectDid as jest.Mock).mockReturnValue(undefined);
  });

  it('useOzoneSubjectStatus returns the first status', async () => {
    mockQueryStatuses.mockResolvedValue({ subjectStatuses: [{ id: 1 }, { id: 2 }] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneSubjectStatus('did:subject'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQueryStatuses).toHaveBeenCalledWith('token', 'did:ozone', {
      subject: 'did:subject',
      limit: 1,
    });
    expect(result.current.data).toEqual({ id: 1 });
  });

  it('useOzoneSubjectStatus is disabled without subject', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneSubjectStatus(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockQueryStatuses).not.toHaveBeenCalled();
  });

  it('useOzoneSubjectEvents queries events and enriches with avatars', async () => {
    mockQueryEvents.mockResolvedValue({
      events: [
        { createdBy: 'did:creator', subject: { did: 'did:sub' } },
      ],
    });
    (subjectDid as jest.Mock).mockReturnValue('did:sub');
    (fetchAvatarsByDid as jest.Mock).mockResolvedValue(
      new Map([
        ['did:creator', 'creator-av'],
        ['did:sub', 'sub-av'],
      ]),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneSubjectEvents('did:sub', 10), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQueryEvents).toHaveBeenCalledWith('token', 'did:ozone', {
      subject: 'did:sub',
      limit: 10,
      includeAllUserRecords: true,
      sortDirection: 'desc',
    });
    expect(result.current.data?.[0]).toMatchObject({
      creatorAvatar: 'creator-av',
      subjectAvatar: 'sub-av',
    });
  });

  it('useOzoneSubjectEvents uses includeAllUserRecords=false for non-did subjects', async () => {
    mockQueryEvents.mockResolvedValue({ events: [] });
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useOzoneSubjectEvents('at://did:plc:x/app.bsky.feed.post/abc'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQueryEvents).toHaveBeenCalledWith(
      'token',
      'did:ozone',
      expect.objectContaining({ includeAllUserRecords: false, limit: 50 }),
    );
  });

  it('useOzoneSubjectEvents falls back to raw events when enrichment throws', async () => {
    mockQueryEvents.mockResolvedValue({ events: [{ createdBy: 'did:c', subject: {} }] });
    (fetchAvatarsByDid as jest.Mock).mockRejectedValue(new Error('boom'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneSubjectEvents('did:sub'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ createdBy: 'did:c', subject: {} }]);
  });

  it('useOzoneSubjectEvents is disabled without subject', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneSubjectEvents(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockQueryEvents).not.toHaveBeenCalled();
  });
});
