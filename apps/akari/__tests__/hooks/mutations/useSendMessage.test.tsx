import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSendMessage } from '@/hooks/mutations/useSendMessage';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockSendMessage = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    sendMessage: mockSendMessage,
  })),
}));

describe('useSendMessage mutation hook', () => {
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
      data: { did: 'did', pdsUrl: 'https://pds' },
    });
    mockSendMessage.mockResolvedValue({});
  });

  it('sends a message successfully', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    result.current.mutate({ convoId: 'c1', text: 'hi' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockSendMessage).toHaveBeenCalledWith('c1', { text: 'hi' });
  });

  it('errors when token missing', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    result.current.mutate({ convoId: 'c1', text: 'hi' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('errors when user DID missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { pdsUrl: 'https://pds' },
    });
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(['messages', 'c1'], { pages: [{}] });
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    result.current.mutate({ convoId: 'c1', text: 'hi' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('errors when pdsUrl missing', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({
      data: { did: 'did' },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    result.current.mutate({ convoId: 'c1', text: 'hi' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('rolls back optimistic update on error', async () => {
    mockSendMessage.mockRejectedValue(new Error('fail'));
    const { queryClient, wrapper } = createWrapper();
    const original = {
      pages: [
        {
          messages: [
            {
              id: 'm1',
              rev: 'rev1',
              text: 'old',
              facets: undefined,
              embed: undefined,
              reactions: [],
              sender: { did: 'did' },
              sentAt: '2023-01-01T00:00:00Z',
            },
          ],
        },
      ],
    };
    queryClient.setQueryData(['messages', 'c1'], original);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    result.current.mutate({ convoId: 'c1', text: 'hi' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData(['messages', 'c1'])).toEqual(original);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['messages', 'c1'] });
  });
});

