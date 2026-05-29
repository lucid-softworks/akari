import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { usePreferences } from '@/hooks/queries/usePreferences';

jest.mock('@/hooks/queries/usePreferences', () => ({ usePreferences: jest.fn() }));

describe('useAcceptLabelerDids hook', () => {
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

  it('returns an empty array when preferences are unavailable', () => {
    (usePreferences as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAcceptLabelerDids(), { wrapper });

    expect(result.current).toEqual([]);
  });

  it('extracts labeler DIDs from the labelersPref preference', () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: {
        preferences: [
          { $type: 'app.bsky.actor.defs#savedFeedsPrefV2', items: [] },
          {
            $type: 'app.bsky.actor.defs#labelersPref',
            labelers: [{ did: 'did:labeler:1' }, { did: 'did:labeler:2' }, {}],
          },
        ],
      },
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAcceptLabelerDids(), { wrapper });

    expect(result.current).toEqual(['did:labeler:1', 'did:labeler:2']);
  });

  it('returns a stable reference across renders when preferences are unchanged', () => {
    const data = {
      preferences: [
        { $type: 'app.bsky.actor.defs#labelersPref', labelers: [{ did: 'did:x' }] },
      ],
    };
    (usePreferences as jest.Mock).mockReturnValue({ data });
    const { wrapper } = createWrapper();

    const { result, rerender } = renderHook(() => useAcceptLabelerDids(), { wrapper });
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });
});
