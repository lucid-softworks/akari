import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useProfileBlocks } from '@/hooks/useProfileBlocks';

const mockGetBlocklistTotal = jest.fn();
const mockGetSingleBlocklistTotal = jest.fn();

jest.mock(
  '@/clearsky-api',
  () => ({
    ClearSkyApi: jest.fn(() => ({
      getBlocklistTotal: mockGetBlocklistTotal,
      getSingleBlocklistTotal: mockGetSingleBlocklistTotal,
    })),
  }),
  { virtual: true },
);

describe('useProfileBlocks', () => {
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
  });

  it('fetches block totals from ClearSky', async () => {
    mockGetBlocklistTotal.mockResolvedValue({
      data: { count: 42 },
    });
    mockGetSingleBlocklistTotal.mockResolvedValue({
      data: { count: 13 },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfileBlocks('did:example:123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetBlocklistTotal).toHaveBeenCalledWith('did:example:123');
    expect(mockGetSingleBlocklistTotal).toHaveBeenCalledWith('did:example:123');
    expect(result.current.data).toEqual({ blocking: 42, blocked: 13 });
  });

  it('throws an error when identifier is missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfileBlocks(undefined), { wrapper });

    const fetchResult = await result.current.refetch();

    expect(fetchResult.error).toBeInstanceOf(Error);
    expect((fetchResult.error as Error).message).toBe('No identifier provided');
    expect(mockGetBlocklistTotal).not.toHaveBeenCalled();
    expect(mockGetSingleBlocklistTotal).not.toHaveBeenCalled();
  });
});
