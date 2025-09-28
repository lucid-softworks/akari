import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useViewerLists } from '@/hooks/queries/useViewerLists';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetLists = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({ getLists: mockGetLists })),
}));

describe('useViewerLists query hook', () => {
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
      data: { did: 'did:viewer', pdsUrl: 'https://pds' },
    });
  });

  it('fetches viewer lists when prerequisites satisfied', async () => {
    const lists = { lists: [{ uri: 'at://list/1', name: 'List' }] };
    mockGetLists.mockResolvedValueOnce(lists);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useViewerLists(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(lists);
    });

    expect(mockGetLists).toHaveBeenCalledWith('token', 'did:viewer');
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useViewerLists(), { wrapper });

    let refetchResult;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult.error?.message).toBe('No access token');
    expect(mockGetLists).not.toHaveBeenCalled();
  });

  it('errors when DID missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useViewerLists(), { wrapper });

    let refetchResult;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult.error?.message).toBe('No DID available');
    expect(mockGetLists).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:viewer' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useViewerLists(), { wrapper });

    let refetchResult;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult.error?.message).toBe('No PDS URL available');
    expect(mockGetLists).not.toHaveBeenCalled();
  });
});
