import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useStandardDocument } from '@/hooks/queries/useStandardDocument';
import { resolveDidToPds } from '@/utils/oauth/discovery';

jest.mock('@/utils/oauth/discovery', () => ({
  resolveDidToPds: jest.fn(),
}));

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

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
  (resolveDidToPds as jest.Mock).mockResolvedValue('https://doc.pds');
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('useStandardDocument query hook', () => {
  it('resolves the PDS and returns the record value', async () => {
    const value = { title: 'Hello', publishedAt: '2024-01-01T00:00:00Z' };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ uri: 'at://doc', cid: 'cid', value }),
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useStandardDocument({ did: 'did:author', rkey: 'rk1' }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(resolveDidToPds).toHaveBeenCalledWith('did:author');
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://doc.pds/xrpc/com.atproto.repo.getRecord');
    expect(calledUrl).toContain('repo=did%3Aauthor');
    expect(calledUrl).toContain('collection=site.standard.document');
    expect(calledUrl).toContain('rkey=rk1');
    expect(result.current.data).toEqual(value);
  });

  it('throws when the getRecord request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useStandardDocument({ did: 'did:author', rkey: 'rk1' }),
      { wrapper },
    );

    // The hook sets `retry: 1`, so it retries once (with backoff) before
    // surfacing the error — give waitFor extra headroom past the retry delay.
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 },
    );
    expect((result.current.error as Error).message).toBe('getRecord failed: 500');
  });

  it('is disabled when the ref is null', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useStandardDocument(null), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is disabled when the rkey is missing', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useStandardDocument({ did: 'did:author', rkey: '' }),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
  });
});
