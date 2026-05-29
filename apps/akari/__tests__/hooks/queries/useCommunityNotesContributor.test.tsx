import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useMyContributorProfile,
  useNotesPendingRating,
  usePendingPostsNeedingNotes,
} from '@/hooks/queries/useCommunityNotesContributor';

describe('useCommunityNotesContributor query hooks', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper };
  };

  it('usePendingPostsNeedingNotes resolves to an empty array', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePendingPostsNeedingNotes(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([]);
  });

  it('useNotesPendingRating resolves to an empty array', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useNotesPendingRating(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([]);
  });

  it('useMyContributorProfile resolves to a zeroed summary', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMyContributorProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toMatchObject({
      notesWritten: 0,
      helpfulRate: 0,
      ratingsGiven: 0,
      recentNotes: [],
    });
    expect(typeof result.current.data?.joinedAt).toBe('string');
  });
});
