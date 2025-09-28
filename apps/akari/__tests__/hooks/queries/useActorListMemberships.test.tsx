import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useActorListMemberships } from '@/hooks/queries/useActorListMemberships';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockListListItems = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({ listListItems: mockListListItems })),
}));

describe('useActorListMemberships query hook', () => {
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

  it('collects membership records across pages', async () => {
    mockListListItems
      .mockResolvedValueOnce({
        cursor: 'cursor-1',
        records: [
          {
            uri: 'at://listitem/1',
            cid: 'cid1',
            value: { subject: 'did:target', list: 'at://list/1', createdAt: '2024-01-01T00:00:00Z' },
          },
        ],
      })
      .mockResolvedValueOnce({
        records: [
          {
            uri: 'at://listitem/2',
            cid: 'cid2',
            value: { subject: 'did:target', list: 'at://list/2', createdAt: '2024-01-02T00:00:00Z' },
          },
          {
            uri: 'at://listitem/3',
            cid: 'cid3',
            value: { subject: 'did:someoneElse', list: 'at://list/ignore', createdAt: '2024-01-03T00:00:00Z' },
          },
        ],
      });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useActorListMemberships('did:target'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        listUris: ['at://list/1', 'at://list/2'],
        recordUrisByListUri: {
          'at://list/1': 'at://listitem/1',
          'at://list/2': 'at://listitem/2',
        },
      });
    });

    expect(mockListListItems).toHaveBeenNthCalledWith(1, 'token', 'did:viewer', 100, undefined);
    expect(mockListListItems).toHaveBeenNthCalledWith(2, 'token', 'did:viewer', 100, 'cursor-1');
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useActorListMemberships('did:target'), { wrapper });

    let refetchResult;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult.error?.message).toBe('No access token');
    expect(mockListListItems).not.toHaveBeenCalled();
  });

  it('errors when actor DID missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useActorListMemberships(undefined), { wrapper });

    let refetchResult;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult.error?.message).toBe('No actor DID provided');
    expect(mockListListItems).not.toHaveBeenCalled();
  });

  it('errors when PDS URL missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:viewer' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useActorListMemberships('did:target'), { wrapper });

    let refetchResult;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult.error?.message).toBe('No PDS URL available');
    expect(mockListListItems).not.toHaveBeenCalled();
  });

  it('errors when viewer DID missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useActorListMemberships('did:target'), { wrapper });

    let refetchResult;
    await act(async () => {
      refetchResult = await result.current.refetch();
    });

    expect(refetchResult.error?.message).toBe('No DID available');
    expect(mockListListItems).not.toHaveBeenCalled();
  });
});
