import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useMessages } from '@/hooks/queries/useMessages';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockGetMessages = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getMessages: mockGetMessages,
  })),
}));

describe('useMessages', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 } },
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
      data: { did: 'did:me', pdsUrl: 'https://pds' },
    });
  });

  it('fetches messages and transforms data', async () => {
    mockGetMessages.mockResolvedValueOnce({
      messages: [
        {
          id: '1',
          text: 'hello',
          sentAt: '2023-01-01T00:00:00Z',
          sender: { did: 'did:other' },
        },
      ],
      cursor: 'cursor',
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledWith('token', 'convo', 10, undefined);

    const timestamp = new Date('2023-01-01T00:00:00Z').toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(result.current.data?.pages[0]).toEqual({
      messages: [
        {
          id: '1',
          text: 'hello',
          timestamp,
          isFromMe: false,
          sentAt: '2023-01-01T00:00:00Z',
        },
      ],
      cursor: 'cursor',
    });
  });

  it('returns permission error when API responds 401', async () => {
    mockGetMessages.mockRejectedValueOnce({ response: { status: 401 } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(1);
    expect(result.current.error).toEqual({
      type: 'permission',
      message: "Your app password doesn't have permission to access messages",
    });
  });

  it('returns network error on network failure and retries', async () => {
    mockGetMessages.mockRejectedValue({ code: 'NETWORK_ERROR' });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMessages('convo', 10), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockGetMessages).toHaveBeenCalledTimes(4);
    expect(result.current.error).toEqual({
      type: 'network',
      message: 'Network error. Please check your connection and try again',
    });
  });

  it('does not run query when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });

    const { wrapper } = createWrapper();
    renderHook(() => useMessages('convo', 10), { wrapper });

    expect(mockGetMessages).not.toHaveBeenCalled();
  });
});

