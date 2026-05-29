import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useBookmarks } from '@/hooks/queries/useBookmarks';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';

const mockGetBookmarks = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/queries/useAcceptLabelerDids', () => ({
  useAcceptLabelerDids: jest.fn(),
}));

jest.mock('@/hooks/useAppViewEnabled', () => ({
  useAppViewEnabled: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewEnabled: jest.fn(),
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getBookmarks: mockGetBookmarks,
  })),
}));

describe('useBookmarks query hook', () => {
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
    (useAcceptLabelerDids as jest.Mock).mockReturnValue(['did:labeler']);
    (useAppViewEnabled as jest.Mock).mockReturnValue(true);
    (readAppViewEnabled as jest.Mock).mockReturnValue(true);
  });

  it('fetches bookmarks and paginates by cursor', async () => {
    mockGetBookmarks
      .mockResolvedValueOnce({ bookmarks: [{ uri: 'a' }], cursor: 'next' })
      .mockResolvedValueOnce({ bookmarks: [{ uri: 'b' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBookmarks(10), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetBookmarks).toHaveBeenCalledWith('token', 10, undefined, ['did:labeler']);
    expect(result.current.data?.pages[0]).toEqual({ bookmarks: [{ uri: 'a' }], cursor: 'next' });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });
    expect(mockGetBookmarks).toHaveBeenLastCalledWith('token', 10, 'next', ['did:labeler']);
  });

  it('uses the default limit of 50 when omitted', async () => {
    mockGetBookmarks.mockResolvedValueOnce({ bookmarks: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBookmarks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetBookmarks).toHaveBeenCalledWith('token', 50, undefined, ['did:labeler']);
  });

  it('throws AppViewRequiredError when the AppView is disabled', async () => {
    (readAppViewEnabled as jest.Mock).mockReturnValue(false);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBookmarks(10), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toContain('bookmarks');
    expect(mockGetBookmarks).not.toHaveBeenCalled();
  });

  it('is disabled when token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBookmarks(10), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetBookmarks).not.toHaveBeenCalled();
  });

  it('is disabled when did is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBookmarks(10), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetBookmarks).not.toHaveBeenCalled();
  });
});
