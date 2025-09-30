import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLeafletDocuments } from '@/hooks/queries/useLeafletDocuments';

const mockListRecords = jest.fn();
const mockGetPdsUrlFromDid = jest.fn();

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    listRecords: mockListRecords,
  })),
  getPdsUrlFromDid: jest.fn((did: string) => mockGetPdsUrlFromDid(did)),
}));

describe('useLeafletDocuments', () => {
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
    mockGetPdsUrlFromDid.mockResolvedValue('https://pds.example');
  });

  it('fetches and paginates leaflet documents', async () => {
    mockListRecords
      .mockResolvedValueOnce({
        records: [{ uri: 'doc1' }],
        cursor: 'cursor1',
      })
      .mockResolvedValueOnce({
        records: [{ uri: 'doc2' }],
        cursor: undefined,
      });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLeafletDocuments('did:example:alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ uri: 'doc1' }]);
    expect(mockGetPdsUrlFromDid).toHaveBeenCalledTimes(1);
    expect(mockGetPdsUrlFromDid).toHaveBeenCalledWith('did:example:alice');
    expect(mockListRecords).toHaveBeenCalledWith({
      collection: 'pub.leaflet.document',
      repo: 'did:example:alice',
      limit: 5,
      cursor: undefined,
      reverse: true,
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'doc1' }, { uri: 'doc2' }]);
    });

    expect(mockListRecords).toHaveBeenLastCalledWith({
      collection: 'pub.leaflet.document',
      repo: 'did:example:alice',
      limit: 5,
      cursor: 'cursor1',
      reverse: true,
    });
    expect(mockGetPdsUrlFromDid).toHaveBeenCalledTimes(1);
  });

  it('throws when DID is missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLeafletDocuments(undefined), { wrapper });

    await expect(result.current.refetch({ throwOnError: true })).rejects.toThrow('No DID provided');
  });

  it('throws when PDS cannot be resolved', async () => {
    mockGetPdsUrlFromDid.mockResolvedValueOnce(null);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLeafletDocuments('did:example:alice'), { wrapper });

    await expect(result.current.refetch({ throwOnError: true })).rejects.toThrow(
      'Unable to resolve PDS URL',
    );
  });
});
