import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  usePoll,
  usePollVotes,
  useIsPollClosed,
  recordLocalVote,
  clearLocalVote,
} from '@/hooks/queries/usePoll';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { getPollRecord, getPollVotes } from '@/hooks/queries/microcosm';

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/queries/microcosm', () => ({
  getPollRecord: jest.fn(),
  getPollVotes: jest.fn(),
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
  (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
});

describe('usePoll query hook', () => {
  it('fetches the poll record by URI', async () => {
    (getPollRecord as jest.Mock).mockResolvedValueOnce({ uri: 'at://poll', value: {} });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePoll('at://poll'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getPollRecord).toHaveBeenCalledWith('at://poll');
    expect(result.current.data).toEqual({ uri: 'at://poll', value: {} });
  });

  it('is disabled when no poll URI is provided', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePoll(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getPollRecord).not.toHaveBeenCalled();
  });
});

describe('usePollVotes query hook', () => {
  it('tallies network votes (last seen wins) and reports the viewer choice', async () => {
    (getPollVotes as jest.Mock).mockResolvedValueOnce({
      voters: [
        { did: 'did:a', optionIndex: 0 },
        { did: 'did:b', optionIndex: 1 },
        { did: 'did:a', optionIndex: 1 }, // re-vote, last wins
        { did: 'did:me', optionIndex: 0 },
      ],
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePollVotes('at://poll'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({
      counts: [1, 2],
      total: 3,
      sampled: 3,
      myOptionIndex: 0,
    });
  });

  it('overlays a locally-recorded vote that the network has not indexed yet', async () => {
    (getPollVotes as jest.Mock).mockResolvedValueOnce({
      voters: [{ did: 'did:a', optionIndex: 0 }],
    });
    recordLocalVote('at://poll2', 'did:me', 1);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePollVotes('at://poll2'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.myOptionIndex).toBe(1);
    expect(result.current.data?.total).toBe(2);
    clearLocalVote('at://poll2', 'did:me');
  });

  it('respects the enabled flag', () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => usePollVotes('at://poll', false), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getPollVotes).not.toHaveBeenCalled();
  });
});

describe('useIsPollClosed', () => {
  it('returns false when no endsAt is given', () => {
    const { result } = renderHook(() => useIsPollClosed(undefined));
    expect(result.current).toBe(false);
  });

  it('returns true when endsAt is in the past', () => {
    const { result } = renderHook(() => useIsPollClosed('2000-01-01T00:00:00Z'));
    expect(result.current).toBe(true);
  });

  it('returns false when endsAt is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { result } = renderHook(() => useIsPollClosed(future));
    expect(result.current).toBe(false);
  });

  it('returns false for an unparseable date', () => {
    const { result } = renderHook(() => useIsPollClosed('not-a-date'));
    expect(result.current).toBe(false);
  });
});
