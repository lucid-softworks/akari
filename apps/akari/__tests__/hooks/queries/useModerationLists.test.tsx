import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useModerationLists } from '@/hooks/queries/useModerationLists';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';

const mockGetListMutes = jest.fn();
const mockGetListBlocks = jest.fn();

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
  BlueskyApi: jest.fn(() => ({
    getListMutes: mockGetListMutes,
    getListBlocks: mockGetListBlocks,
  })),
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

describe('useModerationLists query hook', () => {
  it('merges muted and blocked lists, deduped by URI', async () => {
    mockGetListMutes.mockResolvedValueOnce({
      lists: [{ uri: 'at://list/muted' }, { uri: 'at://list/both' }],
    });
    mockGetListBlocks.mockResolvedValueOnce({
      lists: [
        { uri: 'at://list/both', viewer: { blocked: 'at://block/both' } },
        { uri: 'at://list/blocked', viewer: { blocked: 'at://block/blocked' } },
      ],
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useModerationLists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetListMutes).toHaveBeenCalledWith('token', 50);
    expect(mockGetListBlocks).toHaveBeenCalledWith('token', 50);
    expect(result.current.data).toEqual([
      { list: { uri: 'at://list/muted' }, muted: true },
      {
        // Muted entry wins the dedupe; the listblock URI is layered on.
        list: { uri: 'at://list/both' },
        muted: true,
        blockedUri: 'at://block/both',
      },
      {
        list: { uri: 'at://list/blocked', viewer: { blocked: 'at://block/blocked' } },
        muted: false,
        blockedUri: 'at://block/blocked',
      },
    ]);
  });

  it('is disabled when token or pdsUrl is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useModerationLists(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetListMutes).not.toHaveBeenCalled();
  });

  it('throws when the AppView is disabled', async () => {
    (readAppViewEnabled as jest.Mock).mockReturnValue(false);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useModerationLists(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockGetListMutes).not.toHaveBeenCalled();
  });
});
