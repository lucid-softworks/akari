import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useVotePoll } from '@/hooks/mutations/useVotePoll';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { recordLocalVote, clearLocalVote, type PollVotes } from '@/hooks/queries/usePoll';

const mockCreatePollVote = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/queries/usePoll', () => ({
  recordLocalVote: jest.fn(),
  clearLocalVote: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createPollVote: mockCreatePollVote,
  })),
}));

const poll = { uri: 'at://poll', cid: 'cid' };

describe('useVotePoll mutation hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds', did: 'did:current' },
    });
    mockCreatePollVote.mockResolvedValue({ uri: 'at://vote' });
  });

  it('casts a vote and records it locally', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useVotePoll(), { wrapper });

    result.current.mutate({ poll, optionIndex: 1 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockCreatePollVote).toHaveBeenCalledWith('token', 'did:current', {
      poll,
      optionIndex: 1,
    });
    expect(recordLocalVote).toHaveBeenCalledWith('at://poll', 'did:current', 1);
  });

  it('optimistically bumps the tally cache for a first-time vote', async () => {
    const { queryClient, wrapper } = createWrapper();
    const key = ['pollVotes', 'at://poll', 'did:current'];
    queryClient.setQueryData<PollVotes>(key, {
      counts: [2, 0],
      total: 2,
      sampled: 2,
      myOptionIndex: null,
    });

    const { result } = renderHook(() => useVotePoll(), { wrapper });
    result.current.mutate({ poll, optionIndex: 1 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const updated = queryClient.getQueryData<PollVotes>(key);
    expect(updated).toEqual({
      counts: [2, 1],
      total: 3,
      sampled: 3,
      myOptionIndex: 1,
    });
  });

  it('does not re-bump when the viewer already voted', async () => {
    const { queryClient, wrapper } = createWrapper();
    const key = ['pollVotes', 'at://poll', 'did:current'];
    queryClient.setQueryData<PollVotes>(key, {
      counts: [1, 1],
      total: 2,
      sampled: 2,
      myOptionIndex: 0,
    });

    const { result } = renderHook(() => useVotePoll(), { wrapper });
    result.current.mutate({ poll, optionIndex: 1 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryClient.getQueryData<PollVotes>(key)).toEqual({
      counts: [1, 1],
      total: 2,
      sampled: 2,
      myOptionIndex: 0,
    });
  });

  it('rolls back the optimistic vote on error', async () => {
    const { queryClient, wrapper } = createWrapper();
    const key = ['pollVotes', 'at://poll', 'did:current'];
    const previous: PollVotes = { counts: [2, 0], total: 2, sampled: 2, myOptionIndex: null };
    queryClient.setQueryData<PollVotes>(key, previous);
    mockCreatePollVote.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useVotePoll(), { wrapper });
    result.current.mutate({ poll, optionIndex: 1 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(clearLocalVote).toHaveBeenCalledWith('at://poll', 'did:current');
    expect(queryClient.getQueryData<PollVotes>(key)).toEqual(previous);
  });

  it('errors when not signed in', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useVotePoll(), { wrapper });

    result.current.mutate({ poll, optionIndex: 0 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreatePollVote).not.toHaveBeenCalled();
  });
});
