import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useOzoneQueue } from '@/hooks/queries/useOzoneQueue';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';
import { apiForAccount } from '@/utils/blueskyApi';
import { fetchAvatarsByDid, subjectDid } from '@/utils/ozoneAvatars';

const mockQueryStatuses = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({ useJwtToken: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useOzoneSettings', () => ({ useOzoneDid: jest.fn() }));
jest.mock('@/utils/blueskyOzone', () => ({ ozoneForAccount: jest.fn() }));
jest.mock('@/utils/blueskyApi', () => ({ apiForAccount: jest.fn() }));
jest.mock('@/utils/ozoneAvatars', () => ({
  fetchAvatarsByDid: jest.fn(),
  subjectDid: jest.fn(),
}));

describe('useOzoneQueue hook', () => {
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
    (ozoneForAccount as jest.Mock).mockReturnValue({ queryStatuses: mockQueryStatuses });
    (apiForAccount as jest.Mock).mockReturnValue({});
    (fetchAvatarsByDid as jest.Mock).mockResolvedValue(new Map());
    (subjectDid as jest.Mock).mockReturnValue(undefined);
  });

  it('queries statuses with filters and splices avatars into accountStats', async () => {
    mockQueryStatuses.mockResolvedValue({
      subjectStatuses: [{ subject: { did: 'did:s' }, accountStats: { reportCount: 3 } }],
      cursor: 'next',
    });
    (subjectDid as jest.Mock).mockReturnValue('did:s');
    (fetchAvatarsByDid as jest.Mock).mockResolvedValue(new Map([['did:s', 'av']]));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneQueue({ reviewState: 'open' } as never, 50), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockQueryStatuses).toHaveBeenCalledWith('token', 'did:ozone', {
      reviewState: 'open',
      limit: 50,
      cursor: undefined,
    });
    expect(result.current.data?.pages[0].subjectStatuses[0]).toEqual({
      subject: { did: 'did:s' },
      accountStats: { reportCount: 3, avatar: 'av' },
    });
    expect(result.current.hasNextPage).toBe(true);
  });

  it('leaves rows untouched when no avatar is found', async () => {
    mockQueryStatuses.mockResolvedValue({
      subjectStatuses: [{ subject: { did: 'did:s' } }],
      cursor: undefined,
    });
    (subjectDid as jest.Mock).mockReturnValue('did:s');
    (fetchAvatarsByDid as jest.Mock).mockResolvedValue(new Map());
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneQueue(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].subjectStatuses[0]).toEqual({ subject: { did: 'did:s' } });
  });

  it('paginates using the cursor', async () => {
    mockQueryStatuses
      .mockResolvedValueOnce({ subjectStatuses: [{ subject: {} }], cursor: 'c1' })
      .mockResolvedValueOnce({ subjectStatuses: [{ subject: {} }], cursor: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneQueue({}, 25), { wrapper });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));
    expect(mockQueryStatuses).toHaveBeenLastCalledWith('token', 'did:ozone', {
      limit: 25,
      cursor: 'c1',
    });
  });

  it('falls back to raw response when enrichment throws', async () => {
    mockQueryStatuses.mockResolvedValue({ subjectStatuses: [{ subject: {} }], cursor: undefined });
    (fetchAvatarsByDid as jest.Mock).mockRejectedValue(new Error('boom'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneQueue(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual({
      subjectStatuses: [{ subject: {} }],
      cursor: undefined,
    });
  });

  it('is disabled when ozoneDid missing', () => {
    (useOzoneDid as jest.Mock).mockReturnValue('');
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOzoneQueue(), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockQueryStatuses).not.toHaveBeenCalled();
  });
});
