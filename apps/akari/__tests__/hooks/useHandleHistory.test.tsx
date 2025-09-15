import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useHandleHistory } from '@/hooks/useHandleHistory';

const mockGetHandleHistory = jest.fn();

jest.mock(
  '@/clearsky-api',
  () => ({
    ClearSkyApi: jest.fn(() => ({
      getHandleHistory: mockGetHandleHistory,
    })),
  }),
  { virtual: true },
);

describe('useHandleHistory', () => {
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

  it('fetches and transforms handle history', async () => {
    mockGetHandleHistory.mockResolvedValue({
      data: {
        identifier: 'did:example:123',
        handle_history: [
          ['alice.bsky.social', '2024-01-01T00:00:00Z', 'https://pds1'],
          ['bob.bsky.social', '2024-02-01T00:00:00Z', 'https://pds2'],
        ],
      },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHandleHistory('did:example:123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetHandleHistory).toHaveBeenCalledWith('did:example:123');
    expect(result.current.data).toEqual([
      { handle: 'alice.bsky.social', changedAt: '2024-01-01T00:00:00Z', pds: 'https://pds1' },
      { handle: 'bob.bsky.social', changedAt: '2024-02-01T00:00:00Z', pds: 'https://pds2' },
    ]);
  });

  it('throws error when identifier is missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHandleHistory(undefined), { wrapper });

    const fetchResult = await result.current.refetch();

    expect(fetchResult.error).toBeInstanceOf(Error);
    expect((fetchResult.error as Error).message).toBe('No identifier provided');
    expect(mockGetHandleHistory).not.toHaveBeenCalled();
  });
});
