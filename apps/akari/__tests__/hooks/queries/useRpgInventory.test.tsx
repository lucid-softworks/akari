import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useRpgInventory } from '@/hooks/queries/useRpgInventory';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';

const mockGetActorRpgInventory = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/usePdsUrl', () => ({
  usePdsUrl: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getActorRpgInventory: mockGetActorRpgInventory,
  })),
}));

describe('useRpgInventory query hook', () => {
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
    (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: false });
  });

  it('fetches inventory items and flattens pages across fetchNextPage', async () => {
    mockGetActorRpgInventory
      .mockResolvedValueOnce({ records: [{ uri: 'i1' }], cursor: 'next' })
      .mockResolvedValueOnce({ records: [{ uri: 'i2' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useRpgInventory('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorRpgInventory).toHaveBeenCalledWith('token', 'alice', 5, undefined);
    expect(result.current.data).toEqual([{ uri: 'i1' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'i1' }, { uri: 'i2' }]);
    });
    expect(mockGetActorRpgInventory).toHaveBeenLastCalledWith('token', 'alice', 5, 'next');
  });

  it('defaults the limit to 50', async () => {
    mockGetActorRpgInventory.mockResolvedValueOnce({ records: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useRpgInventory('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorRpgInventory).toHaveBeenCalledWith('token', 'alice', 50, undefined);
  });

  it('is disabled when there is no token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useRpgInventory('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorRpgInventory).not.toHaveBeenCalled();
  });

  it('is disabled when there is no identifier', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useRpgInventory(undefined, 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorRpgInventory).not.toHaveBeenCalled();
  });

  it('is disabled when the PDS URL is missing', async () => {
    (usePdsUrl as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useRpgInventory('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorRpgInventory).not.toHaveBeenCalled();
  });
});
