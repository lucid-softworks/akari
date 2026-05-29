import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useSubmitCommunityNote,
  useRequestCommunityNote,
} from '@/hooks/mutations/useSubmitCommunityNote';

describe('useSubmitCommunityNote stub hooks', () => {
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

  it('submits a community note and resolves ok', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitCommunityNote(), { wrapper });

    const input = {
      postUri: 'at://post',
      body: 'context',
      sources: ['https://src'],
      classification: 'misleading' as const,
    };
    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({ ok: true });
    expect(logSpy).toHaveBeenCalledWith('[stub useSubmitCommunityNote]', input);
  });

  it('requests a community note and resolves ok', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRequestCommunityNote(), { wrapper });

    const input = {
      postUri: 'at://post',
      reason: 'misinformation' as const,
      comment: 'please review',
    };
    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({ ok: true });
    expect(logSpy).toHaveBeenCalledWith('[stub useRequestCommunityNote]', input);
  });
});
