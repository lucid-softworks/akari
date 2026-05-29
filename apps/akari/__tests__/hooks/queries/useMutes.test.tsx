import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useMutes } from '@/hooks/queries/useMutes';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';

const mockGetMutes = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/useAppViewEnabled', () => ({
  useAppViewEnabled: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewEnabled: jest.fn(() => true),
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({ getMutes: mockGetMutes })),
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
  (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
  (useCurrentAccount as jest.Mock).mockReturnValue({
    data: { pdsUrl: 'https://pds', did: 'did:me' },
  });
  (useAppViewEnabled as jest.Mock).mockReturnValue(true);
  (readAppViewEnabled as jest.Mock).mockReturnValue(true);
});

describe('useMutes query hook', () => {
  it('fetches muted accounts and paginates', async () => {
    mockGetMutes
      .mockResolvedValueOnce({ mutes: [{ did: 'did:a' }], cursor: 'next' })
      .mockResolvedValueOnce({ mutes: [{ did: 'did:b' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMutes(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetMutes).toHaveBeenCalledWith('token', 50, undefined);
    expect(result.current.data?.pages[0]).toEqual({ mutes: [{ did: 'did:a' }], cursor: 'next' });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });
    expect(mockGetMutes).toHaveBeenLastCalledWith('token', 50, 'next');
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMutes(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMutes).not.toHaveBeenCalled();
  });

  it('is disabled when pdsUrl is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'did:me' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMutes(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMutes).not.toHaveBeenCalled();
  });

  it('throws when the AppView is disabled', async () => {
    (readAppViewEnabled as jest.Mock).mockReturnValue(false);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useMutes(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetMutes).not.toHaveBeenCalled();
  });
});
