import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useUserStories } from '@/hooks/queries/useUserStories';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { buildStoryBlobUrl, findStoryImageBlob } from '@/utils/storyMedia';

const mockGetActorFlashesStories = jest.fn();
const mockGetActorSparkStories = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/usePdsUrl', () => ({
  usePdsUrl: jest.fn(),
}));

jest.mock('@/utils/storyMedia', () => ({
  buildStoryBlobUrl: jest.fn(),
  findStoryImageBlob: jest.fn(),
}));

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewSettings: jest.fn(() => ({ preset: 'bsky', cdnPreset: 'bsky', appViewEnabled: true })),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getActorFlashesStories: mockGetActorFlashesStories,
    getActorSparkStories: mockGetActorSparkStories,
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

const futureCreatedAt = new Date(Date.now() - 60_000).toISOString(); // recent, well within 24h

beforeEach(() => {
  jest.clearAllMocks();
  (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
  (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: false });
  (findStoryImageBlob as jest.Mock).mockReturnValue({ cid: 'blobcid', mimeType: 'image/jpeg', size: 123 });
  (buildStoryBlobUrl as jest.Mock).mockReturnValue('https://pds/blob/url');
});

describe('useUserStories hook', () => {
  it('returns active story images from flashes and spark records', async () => {
    mockGetActorFlashesStories.mockResolvedValueOnce({
      records: [
        {
          uri: 'at://did:author/blue.flashes.story.post/1',
          value: { createdAt: futureCreatedAt, expiresInMinutes: 1440 },
        },
      ],
    });
    mockGetActorSparkStories.mockResolvedValueOnce({ records: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUserStories('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.hasActiveStory).toBe(true);
    });
    expect(mockGetActorFlashesStories).toHaveBeenCalledWith('token', 'alice', 50);
    expect(mockGetActorSparkStories).toHaveBeenCalledWith('token', 'alice', 50);
    expect(result.current.images).toEqual([
      { url: 'https://pds/blob/url', mimeType: 'image/jpeg', sizeBytes: 123 },
    ]);
  });

  it('filters out expired stories', async () => {
    mockGetActorFlashesStories.mockResolvedValueOnce({
      records: [
        {
          uri: 'at://did:author/blue.flashes.story.post/old',
          value: { createdAt: '2000-01-01T00:00:00Z', expiresInMinutes: 1440 },
        },
      ],
    });
    mockGetActorSparkStories.mockResolvedValueOnce({ records: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUserStories('alice'), { wrapper });

    await waitFor(() => {
      expect(mockGetActorFlashesStories).toHaveBeenCalled();
    });
    expect(result.current.hasActiveStory).toBe(false);
    expect(result.current.images).toEqual([]);
  });

  it('returns no stories and skips fetching when there is no identifier', () => {
    (usePdsUrl as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUserStories(undefined), { wrapper });

    expect(result.current.images).toEqual([]);
    expect(result.current.hasActiveStory).toBe(false);
    expect(mockGetActorFlashesStories).not.toHaveBeenCalled();
  });

  it('does not fetch while the PDS URL is still loading', () => {
    (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: true });
    const { wrapper } = createWrapper();

    renderHook(() => useUserStories('alice'), { wrapper });

    expect(mockGetActorFlashesStories).not.toHaveBeenCalled();
  });
});
