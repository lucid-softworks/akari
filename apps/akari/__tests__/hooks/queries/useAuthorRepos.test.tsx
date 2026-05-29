import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useAuthorRepos } from '@/hooks/queries/useAuthorRepos';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetActorRepos = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getActorRepos: mockGetActorRepos,
  })),
}));

describe('useAuthorRepos query hook', () => {
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
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
  });

  it('fetches repos and flattens pages across fetchNextPage', async () => {
    mockGetActorRepos
      .mockResolvedValueOnce({ records: [{ uri: 'repo1' }], cursor: 'next' })
      .mockResolvedValueOnce({ records: [{ uri: 'repo2' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRepos('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorRepos).toHaveBeenCalledWith('token', 'alice', 5, undefined);
    expect(result.current.data).toEqual([{ uri: 'repo1' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'repo1' }, { uri: 'repo2' }]);
    });
    expect(mockGetActorRepos).toHaveBeenLastCalledWith('token', 'alice', 5, 'next');
  });

  it('defaults the limit to 50', async () => {
    mockGetActorRepos.mockResolvedValueOnce({ records: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRepos('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorRepos).toHaveBeenCalledWith('token', 'alice', 50, undefined);
  });

  it('throws when the PDS URL is missing at fetch time', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRepos('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toBe('No PDS URL available');
    expect(mockGetActorRepos).not.toHaveBeenCalled();
  });

  it('is disabled when there is no token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRepos('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorRepos).not.toHaveBeenCalled();
  });

  it('is disabled when there is no identifier', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAuthorRepos(undefined, 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorRepos).not.toHaveBeenCalled();
  });
});
