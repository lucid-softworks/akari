import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAkariMembers, useIsAkariMember } from '@/hooks/queries/useAkariMembers';
import { apiForPublicAppView } from '@/utils/blueskyApi';

const mockGetList = jest.fn();

jest.mock('@/utils/blueskyApi', () => ({
  apiForPublicAppView: jest.fn(),
}));

describe('useAkariMembers query hook', () => {
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
    (apiForPublicAppView as jest.Mock).mockReturnValue({ getList: mockGetList });
  });

  it('walks the cursor, dedupes DIDs, and builds a Set + members array', async () => {
    mockGetList
      .mockResolvedValueOnce({
        items: [
          { subject: { did: 'did:a', handle: 'a' } },
          { subject: { did: 'did:b', handle: 'b' } },
        ],
        cursor: 'page2',
      })
      .mockResolvedValueOnce({
        items: [
          { subject: { did: 'did:b', handle: 'b' } }, // duplicate, skipped
          { subject: { did: 'did:c', handle: 'c' } },
          { subject: undefined }, // no did, skipped
        ],
        cursor: undefined,
      });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAkariMembers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetList).toHaveBeenCalledTimes(2);
    expect(mockGetList).toHaveBeenNthCalledWith(
      1,
      '',
      expect.stringContaining('app.bsky.graph.list'),
      100,
      undefined,
    );
    expect(mockGetList).toHaveBeenNthCalledWith(
      2,
      '',
      expect.any(String),
      100,
      'page2',
    );
    expect(result.current.data?.dids).toBeInstanceOf(Set);
    expect([...(result.current.data?.dids ?? [])]).toEqual(['did:a', 'did:b', 'did:c']);
    expect(result.current.data?.members).toHaveLength(3);
  });

  it('handles a missing items array', async () => {
    mockGetList.mockResolvedValueOnce({ cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAkariMembers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.dids.size).toBe(0);
    expect(result.current.data?.members).toEqual([]);
  });
});

describe('useIsAkariMember', () => {
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
    (apiForPublicAppView as jest.Mock).mockReturnValue({ getList: mockGetList });
  });

  it('returns false when no did is provided', () => {
    mockGetList.mockResolvedValue({ items: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useIsAkariMember(undefined), { wrapper });

    expect(result.current).toBe(false);
  });

  it('returns true once the did is in the loaded member set', async () => {
    mockGetList.mockResolvedValue({
      items: [{ subject: { did: 'did:member', handle: 'm' } }],
      cursor: undefined,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useIsAkariMember('did:member'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
