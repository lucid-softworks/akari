import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useLabelers, BSKY_DEFAULT_LABELER_DID } from '@/hooks/queries/useLabelers';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { getAuthor } from '@/hooks/queries/microcosm';

const mockGetLabelerServices = jest.fn();
const mockGetRecord = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/useCurrentAccount', () => ({
  useCurrentAccount: jest.fn(),
}));

jest.mock('@/hooks/queries/usePreferences', () => ({
  usePreferences: jest.fn(),
}));

jest.mock('@/hooks/useAppViewEnabled', () => ({
  useAppViewEnabled: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/hooks/queries/microcosm', () => ({
  getAuthor: jest.fn(),
}));

jest.mock('@/slingshot-api', () => ({
  SlingshotApi: jest.fn(() => ({
    getRecord: (...args: unknown[]) => mockGetRecord(...args),
  })),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({ getLabelerServices: mockGetLabelerServices })),
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
  (useCurrentAccount as jest.Mock).mockReturnValue({ data: { pdsUrl: 'https://pds' } });
  (usePreferences as jest.Mock).mockReturnValue({ data: { preferences: [] } });
  (useAppViewEnabled as jest.Mock).mockReturnValue(true);
});

describe('useLabelers query hook', () => {
  it('fetches labeler services through the AppView, including subscribed and default DIDs', async () => {
    (usePreferences as jest.Mock).mockReturnValue({
      data: {
        preferences: [
          {
            $type: 'app.bsky.actor.defs#labelersPref',
            labelers: [{ did: 'did:custom' }],
          },
        ],
      },
    });
    mockGetLabelerServices.mockResolvedValueOnce({ views: [{ uri: 'labeler-view' }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLabelers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetLabelerServices).toHaveBeenCalledWith('token', [
      BSKY_DEFAULT_LABELER_DID,
      'did:custom',
    ]);
    expect(result.current.data).toEqual([{ uri: 'labeler-view' }]);
  });

  it('hydrates labeler views from slingshot when the AppView is disabled (microcosm path)', async () => {
    (useAppViewEnabled as jest.Mock).mockReturnValue(false);
    mockGetRecord.mockResolvedValueOnce({
      uri: 'at://did:plc:ar7c4by46qjdydhdevvrndac/app.bsky.labeler.service/self',
      cid: 'cid1',
      value: { createdAt: '2024-01-01T00:00:00Z', reasonTypes: ['spam'] },
    });
    (getAuthor as jest.Mock).mockResolvedValueOnce({
      did: BSKY_DEFAULT_LABELER_DID,
      handle: 'mod.bsky.app',
      displayName: 'Mod',
      avatar: 'a.jpg',
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLabelers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetRecord).toHaveBeenCalled();
    expect(mockGetLabelerServices).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([
      {
        uri: 'at://did:plc:ar7c4by46qjdydhdevvrndac/app.bsky.labeler.service/self',
        cid: 'cid1',
        creator: {
          did: BSKY_DEFAULT_LABELER_DID,
          handle: 'mod.bsky.app',
          displayName: 'Mod',
          avatar: 'a.jpg',
        },
        indexedAt: '2024-01-01T00:00:00Z',
        policies: undefined,
        reasonTypes: ['spam'],
        subjectTypes: undefined,
      },
    ]);
  });

  it('drops a labeler that has no service record (microcosm path)', async () => {
    (useAppViewEnabled as jest.Mock).mockReturnValue(false);
    mockGetRecord.mockRejectedValueOnce(new Error('not found'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLabelers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([]);
  });

  it('is disabled when AppView is enabled but token is missing', () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLabelers(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetLabelerServices).not.toHaveBeenCalled();
  });
});
