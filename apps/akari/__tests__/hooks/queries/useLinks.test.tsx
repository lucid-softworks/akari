import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useLinks } from '@/hooks/queries/useLinks';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useProfile } from '@/hooks/queries/useProfile';
import { getPdsUrlFromDid } from '@/bluesky-api';

const mockGetActorLinkatBoards = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useProfile', () => ({
  useProfile: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/bluesky-api', () => ({
  getPdsUrlFromDid: jest.fn(),
  BlueskyApi: jest.fn(() => ({ getActorLinkatBoards: mockGetActorLinkatBoards })),
}));

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
  (useProfile as jest.Mock).mockReturnValue({ data: { did: 'did:target' } });
  (getPdsUrlFromDid as jest.Mock).mockResolvedValue('https://target.pds');
});

describe('useLinks query hook', () => {
  it('resolves the target PDS and flattens link records across pages', async () => {
    mockGetActorLinkatBoards
      .mockResolvedValueOnce({ records: [{ uri: 'l1' }], cursor: 'next' })
      .mockResolvedValueOnce({ records: [{ uri: 'l2' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLinks('alice', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getPdsUrlFromDid).toHaveBeenCalledWith('did:target');
    expect(mockGetActorLinkatBoards).toHaveBeenCalledWith('token', 'did:target', 10, undefined);
    expect(result.current.data).toEqual([{ uri: 'l1' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'l1' }, { uri: 'l2' }]);
    });
    expect(mockGetActorLinkatBoards).toHaveBeenLastCalledWith('token', 'did:target', 10, 'next');
  });

  it('is disabled when no identifier is provided', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLinks(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetActorLinkatBoards).not.toHaveBeenCalled();
  });

  it('is disabled when the profile DID is not yet resolved', () => {
    (useProfile as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLinks('alice'), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('errors when the PDS URL cannot be resolved', async () => {
    (getPdsUrlFromDid as jest.Mock).mockResolvedValueOnce(null);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLinks('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetActorLinkatBoards).not.toHaveBeenCalled();
  });
});
