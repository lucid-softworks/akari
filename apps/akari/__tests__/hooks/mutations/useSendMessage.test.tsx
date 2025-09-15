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
    expect(mockSendMessage).toHaveBeenCalledWith('token', 'c1', { text: 'hi' });
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
});

