import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useBlocks } from '@/hooks/queries/useBlocks';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { getAuthor, pdsListRecords } from '@/hooks/queries/microcosm';

const mockGetBlocks = jest.fn();

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
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/hooks/queries/microcosm', () => ({
  getAuthor: jest.fn(),
  pdsListRecords: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getBlocks: mockGetBlocks,
  })),
}));

describe('useBlocks query hook', () => {
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
  });

  it('fetches blocks through the AppView when enabled', async () => {
    const response = { blocks: [{ did: 'did:blocked' }], cursor: undefined };
    mockGetBlocks.mockResolvedValueOnce(response);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBlocks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetBlocks).toHaveBeenCalledWith('token', 50, undefined);
    expect(result.current.data?.pages[0]).toEqual(response);
  });

  it('hydrates blocks from the PDS when the AppView is disabled (microcosm path)', async () => {
    (useAppViewEnabled as jest.Mock).mockReturnValue(false);
    (pdsListRecords as jest.Mock).mockResolvedValueOnce({
      records: [
        {
          uri: 'at://did:me/app.bsky.graph.block/1',
          value: { subject: 'did:blocked', createdAt: '2024-01-01T00:00:00Z' },
        },
      ],
      cursor: 'next',
    });
    (getAuthor as jest.Mock).mockResolvedValueOnce({
      did: 'did:blocked',
      handle: 'blocked.test',
      displayName: 'Blocked',
      avatar: 'a.jpg',
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBlocks(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(pdsListRecords).toHaveBeenCalledWith({
      pdsUrl: 'https://pds',
      repo: 'did:me',
      collection: 'app.bsky.graph.block',
      limit: 50,
      cursor: undefined,
    });
    expect(mockGetBlocks).not.toHaveBeenCalled();
    expect(result.current.data?.pages[0]).toEqual({
      blocks: [
        {
          did: 'did:blocked',
          handle: 'blocked.test',
          displayName: 'Blocked',
          avatar: 'a.jpg',
          indexedAt: '2024-01-01T00:00:00Z',
          viewer: { blocking: 'at://did:me/app.bsky.graph.block/1' },
          labels: [],
        },
      ],
      cursor: 'next',
    });
  });

  it('is disabled when token is missing and AppView enabled', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBlocks(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetBlocks).not.toHaveBeenCalled();
  });

  it('is disabled when did is missing', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBlocks(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
