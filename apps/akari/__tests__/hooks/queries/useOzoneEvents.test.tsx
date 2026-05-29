import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useOzoneEvents } from '@/hooks/queries/useOzoneEvents';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';
import { apiForAccount } from '@/utils/blueskyApi';
import { fetchAvatarsByDid, subjectDid } from '@/utils/ozoneAvatars';

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

describe('useOzoneEvents hook', () => {
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
    (ozoneForAccount as jest.Mock).mockReturnValue({ queryEvents: mockQueryEvents });
    (apiForAccount as jest.Mock).mockReturnValue({});
    (fetchAvatarsByDid as jest.Mock).mockResolvedValue(new Map());
    (subjectDid as jest.Mock).mockReturnValue(undefined);
  });

  it('queries events with filters and enriches avatars', async () => {
    mockQueryEvents.mockResolvedValue({
      events: [{ createdBy: 'did:c', subject: { did: 'did:s' } }],
      cursor: 'next',
    });
    (subjectDid as jest.Mock).mockReturnValue('did:s');
    (fetchAvatarsByDid as jest.Mock).mockResolvedValue(
      new Map([
        ['did:c', 'cav'],
        ['did:s', 'sav'],
      ]),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneEvents({ types: ['x'] } as never, 20), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQueryEvents).toHaveBeenCalledWith('token', 'did:ozone', {
      types: ['x'],
      limit: 20,
      cursor: undefined,
    });
    expect(result.current.data?.pages[0].events[0]).toMatchObject({
      creatorAvatar: 'cav',
      subjectAvatar: 'sav',
    });
    expect(result.current.hasNextPage).toBe(true);
  });

  it('paginates using the cursor', async () => {
    mockQueryEvents
      .mockResolvedValueOnce({ events: [{ createdBy: 'a', subject: {} }], cursor: 'c1' })
      .mockResolvedValueOnce({ events: [{ createdBy: 'b', subject: {} }], cursor: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneEvents({}, 10), { wrapper });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));
    expect(mockQueryEvents).toHaveBeenLastCalledWith('token', 'did:ozone', {
      limit: 10,
      cursor: 'c1',
    });
  });

  it('falls back to raw response when enrichment throws', async () => {
    mockQueryEvents.mockResolvedValue({ events: [{ createdBy: 'a', subject: {} }], cursor: undefined });
    (fetchAvatarsByDid as jest.Mock).mockRejectedValue(new Error('boom'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneEvents(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual({
      events: [{ createdBy: 'a', subject: {} }],
      cursor: undefined,
    });
  });

  it('is disabled when ozoneDid missing', () => {
    (useOzoneDid as jest.Mock).mockReturnValue('');
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneEvents(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockQueryEvents).not.toHaveBeenCalled();
  });
});
