import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useVerifiersForDid } from '@/hooks/queries/useVerifiersForDid';
import { createConstellationApi } from '@/constellation-api';

const mockGetDistinctDids = jest.fn();

jest.mock('@/constellation-api', () => ({
  createConstellationApi: jest.fn(() => ({ getDistinctDids: mockGetDistinctDids })),
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
});

describe('useVerifiersForDid query hook', () => {
  it('queries Constellation for distinct verifier DIDs', async () => {
    mockGetDistinctDids.mockResolvedValueOnce({ linking_dids: ['did:v1', 'did:v2'] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVerifiersForDid('did:subject'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(createConstellationApi).toHaveBeenCalled();
    expect(mockGetDistinctDids).toHaveBeenCalledWith({
      target: 'did:subject',
      collection: 'app.bsky.graph.verification',
      path: '.subject',
    });
    expect(result.current.data).toEqual(['did:v1', 'did:v2']);
  });

  it('is disabled when no subject DID is provided', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVerifiersForDid(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetDistinctDids).not.toHaveBeenCalled();
  });
});
