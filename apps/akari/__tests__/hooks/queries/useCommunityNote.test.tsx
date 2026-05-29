import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCommunityNote } from '@/hooks/queries/useCommunityNote';

describe('useCommunityNote query hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  it('resolves to null (stub implementation) when given a postUri', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCommunityNote('at://post/1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
  });

  it('is disabled when postUri is undefined', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCommunityNote(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isPending).toBe(true);
  });
});
