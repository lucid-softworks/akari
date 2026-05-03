import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useHandleHistory } from '@/hooks/useHandleHistory';

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

  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('walks the plc.directory audit log and emits entries on handle change', async () => {
    const log = [
      {
        did: 'did:plc:abc',
        cid: 'c1',
        nullified: false,
        createdAt: '2024-01-01T00:00:00Z',
        operation: {
          type: 'plc_operation',
          alsoKnownAs: ['at://alice.bsky.social'],
          services: { atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint: 'https://pds1' } },
        },
      },
      // Same handle — should be skipped.
      {
        did: 'did:plc:abc',
        cid: 'c2',
        nullified: false,
        createdAt: '2024-01-15T00:00:00Z',
        operation: {
          alsoKnownAs: ['at://alice.bsky.social'],
          services: { atproto_pds: { endpoint: 'https://pds1' } },
        },
      },
      // Nullified op — should be skipped even though handle differs.
      {
        did: 'did:plc:abc',
        cid: 'c3',
        nullified: true,
        createdAt: '2024-01-20T00:00:00Z',
        operation: { alsoKnownAs: ['at://nope.bsky.social'] },
      },
      {
        did: 'did:plc:abc',
        cid: 'c4',
        nullified: false,
        createdAt: '2024-02-01T00:00:00Z',
        operation: {
          alsoKnownAs: ['at://bob.bsky.social'],
          services: { atproto_pds: { endpoint: 'https://pds2' } },
        },
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => log,
    }) as unknown as typeof fetch;

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHandleHistory('did:plc:abc'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://plc.directory/did%3Aplc%3Aabc/log/audit'),
    );
    expect(result.current.data).toEqual([
      { handle: 'bob.bsky.social', changedAt: '2024-02-01T00:00:00Z', pds: 'https://pds2' },
      { handle: 'alice.bsky.social', changedAt: '2024-01-01T00:00:00Z', pds: 'https://pds1' },
    ]);
  });

  it('returns an empty list for did:web identities', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHandleHistory('did:web:example.com'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it('throws when identifier is missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useHandleHistory(undefined), { wrapper });

    const fetchResult = await result.current.refetch();

    expect(fetchResult.error).toBeInstanceOf(Error);
    expect((fetchResult.error as Error).message).toBe('No identifier provided');
  });
});
