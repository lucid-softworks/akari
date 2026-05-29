import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useRateCommunityNote } from '@/hooks/mutations/useRateCommunityNote';

describe('useRateCommunityNote stub hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('rates a community note and resolves ok', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRateCommunityNote(), { wrapper });

    const input = {
      noteId: 'note-1',
      helpfulness: 'helpful' as const,
      reasons: ['clear', 'sourced'],
      comment: 'good note',
    };
    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({ ok: true });
    expect(logSpy).toHaveBeenCalledWith('[stub useRateCommunityNote]', input);
  });
});
