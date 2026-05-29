import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePdsUrl, usePdsUrlFromDid } from '@/hooks/queries/usePdsUrl';
import { getPdsUrlFromDid, getPdsUrlFromHandle } from '@/bluesky-api';

// NOTE: jest.setup.js globally mocks getPdsUrlFromDid / getPdsUrlFromHandle to
// resolve to 'https://pds.test'. We rely on that global mock here and assert
// the resolved value accordingly.

describe('usePdsUrl query hooks', () => {
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
    (getPdsUrlFromDid as jest.Mock).mockClear();
    (getPdsUrlFromHandle as jest.Mock).mockClear();
  });

  it('usePdsUrlFromDid resolves the PDS URL for a DID', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePdsUrlFromDid('did:plc:abc'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getPdsUrlFromDid).toHaveBeenCalledWith('did:plc:abc');
    expect(result.current.data).toBe('https://pds.test');
  });

  it('usePdsUrlFromDid is disabled when no DID is provided', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePdsUrlFromDid(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getPdsUrlFromDid).not.toHaveBeenCalled();
  });

  it('usePdsUrl routes a did: identifier through the DID resolver', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePdsUrl('did:plc:xyz'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBe('https://pds.test');
    });
    expect(getPdsUrlFromDid).toHaveBeenCalledWith('did:plc:xyz');
    expect(getPdsUrlFromHandle).not.toHaveBeenCalled();
    expect(result.current.isError).toBe(false);
  });

  it('usePdsUrl routes a handle identifier through the handle resolver', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePdsUrl('alice.bsky.social'), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBe('https://pds.test');
    });
    expect(getPdsUrlFromHandle).toHaveBeenCalledWith('alice.bsky.social');
    expect(getPdsUrlFromDid).not.toHaveBeenCalled();
  });

  it('usePdsUrl is idle for an undefined identifier', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePdsUrl(undefined), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(getPdsUrlFromDid).not.toHaveBeenCalled();
    expect(getPdsUrlFromHandle).not.toHaveBeenCalled();
  });
});
