import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSetLiveStatus } from '@/hooks/mutations/useSetLiveStatus';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const mockSetActorStatus = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    setActorStatus: mockSetActorStatus,
  })),
}));

describe('useSetLiveStatus mutation hook', () => {
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
    mockSetActorStatus.mockResolvedValue(undefined);
  });

  it('publishes a live status with the friendly service name as the card title', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSetLiveStatus(), { wrapper });

    result.current.mutate({ url: 'https://twitch.tv/someone', durationMinutes: 60 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockSetActorStatus).toHaveBeenCalledWith('token', 'did', {
      durationMinutes: 60,
      createdAt: undefined,
      external: {
        uri: 'https://twitch.tv/someone',
        title: 'Twitch',
        description: 'https://twitch.tv/someone',
      },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
  });

  it('preserves createdAt when editing an existing status', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSetLiveStatus(), { wrapper });

    result.current.mutate({
      url: 'https://youtube.com/watch?v=x',
      durationMinutes: 30,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockSetActorStatus).toHaveBeenCalledWith('token', 'did', {
      durationMinutes: 30,
      createdAt: '2026-01-01T00:00:00.000Z',
      external: {
        uri: 'https://youtube.com/watch?v=x',
        title: 'YouTube',
        description: 'https://youtube.com/watch?v=x',
      },
    });
  });

  it('falls back to the raw url as title for an unparseable url', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSetLiveStatus(), { wrapper });

    result.current.mutate({ url: 'not a url', durationMinutes: 15 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockSetActorStatus).toHaveBeenCalledWith(
      'token',
      'did',
      expect.objectContaining({
        external: { uri: 'not a url', title: 'not a url', description: 'not a url' },
      }),
    );
  });

  it('throws when the token is missing', async () => {
    const { wrapper } = createWrapper();
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useSetLiveStatus(), { wrapper });

    result.current.mutate({ url: 'https://twitch.tv/someone', durationMinutes: 60 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockSetActorStatus).not.toHaveBeenCalled();
  });

  it('throws when the DID is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { result } = renderHook(() => useSetLiveStatus(), { wrapper });

    result.current.mutate({ url: 'https://twitch.tv/someone', durationMinutes: 60 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockSetActorStatus).not.toHaveBeenCalled();
  });

  it('throws when the PDS URL is missing', async () => {
    const { wrapper } = createWrapper();
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did' } });
    const { result } = renderHook(() => useSetLiveStatus(), { wrapper });

    result.current.mutate({ url: 'https://twitch.tv/someone', durationMinutes: 60 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockSetActorStatus).not.toHaveBeenCalled();
  });
});
