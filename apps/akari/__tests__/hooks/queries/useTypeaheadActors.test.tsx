import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useTypeaheadActors } from '@/hooks/queries/useTypeaheadActors';
import { useAppViewSettings } from '@/hooks/useAppViewSettings';

jest.mock('@/hooks/useAppViewSettings', () => ({
  useAppViewSettings: jest.fn(),
}));

describe('useTypeaheadActors query hook', () => {
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
    jest.useFakeTimers();
    (useAppViewSettings as jest.Mock).mockReturnValue({
      config: { preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not query for below-threshold input and returns empty data', () => {
    const { wrapper } = createWrapper();
    global.fetch = jest.fn() as unknown as typeof fetch;

    const { result } = renderHook(() => useTypeaheadActors('a'), { wrapper });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('debounces then fetches typeahead actors and strips the leading @', async () => {
    const actors = [{ did: 'did:plc:1', handle: 'alice.bsky.social' }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ actors }),
    }) as unknown as typeof fetch;
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTypeaheadActors('@alice'), { wrapper });

    // Debounce timer (250ms) must fire before the query commits.
    await waitFor(() => {
      jest.advanceTimersByTime(250);
      expect(result.current.data).toEqual(actors);
    });

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as URL;
    expect(calledUrl.toString()).toBe(
      'https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=alice&limit=8',
    );
  });

  it('returns an empty array when the request is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ actors: [{ did: 'x', handle: 'x' }] }),
    }) as unknown as typeof fetch;
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useTypeaheadActors('alice'), { wrapper });

    await waitFor(() => {
      jest.advanceTimersByTime(250);
      expect(global.fetch).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });
});
