import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCreatePoll } from '@/hooks/mutations/useCreatePoll';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { pollEmbedUrlFromRecord } from '@/utils/tokimekiPoll';

const mockCreatePoll = jest.fn();
const mockCreatePost = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/utils/tokimekiPoll', () => ({
  pollEmbedUrlFromRecord: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    createPoll: mockCreatePoll,
    createPost: mockCreatePost,
  })),
}));

const input = {
  question: 'Best color?',
  options: ['Red', 'Blue'],
  endsAt: '2026-06-01T00:00:00.000Z',
  langs: ['en'],
};

describe('useCreatePoll mutation hook', () => {
  let invalidateSpy: jest.SpyInstance;

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
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
    mockCreatePoll.mockResolvedValue({ uri: 'at://poll' });
    mockCreatePost.mockResolvedValue({ uri: 'at://post' });
    (pollEmbedUrlFromRecord as jest.Mock).mockReturnValue('https://tokimeki/poll');
  });

  it('creates the poll record then a post embedding it', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePoll(), { wrapper });

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreatePoll).toHaveBeenCalledWith('token', 'did:current', {
      options: ['Red', 'Blue'],
      endsAt: '2026-06-01T00:00:00.000Z',
    });
    expect(pollEmbedUrlFromRecord).toHaveBeenCalledWith('at://poll', 2);
    expect(mockCreatePost).toHaveBeenCalledWith('token', 'did:current', {
      text: 'Best color?',
      langs: ['en'],
      externalEmbed: {
        uri: 'https://tokimeki/poll',
        title: 'Best color?',
        description: 'Red / Blue',
      },
    });
    expect(result.current.data).toEqual({
      poll: { uri: 'at://poll' },
      post: { uri: 'at://post' },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['feed'] });
  });

  it('falls back to the poll uri when no embed url is derivable', async () => {
    (pollEmbedUrlFromRecord as jest.Mock).mockReturnValue(null);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePoll(), { wrapper });

    result.current.mutate({ ...input, question: '' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreatePost).toHaveBeenCalledWith('token', 'did:current', {
      text: '',
      langs: ['en'],
      externalEmbed: {
        uri: 'at://poll',
        title: 'Red / Blue',
        description: 'Red / Blue',
      },
    });
  });

  it('errors when not signed in', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePoll(), { wrapper });

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockCreatePoll).not.toHaveBeenCalled();
  });
});
