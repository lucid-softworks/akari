import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import {
  useGrainGalleries,
  useGrainGalleryItems,
  useGrainPhotos,
  useGrainPhotoExif,
  indexGrainPhotosByUri,
  indexGrainExifByPhotoUri,
  groupGalleryItems,
} from '@/hooks/queries/useGrainGalleries';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';

const mockGetActorGalleries = jest.fn();
const mockGetActorGrainGalleryItems = jest.fn();
const mockGetActorGrainPhotos = jest.fn();
const mockGetActorGrainPhotoExif = jest.fn();

jest.mock('@/hooks/queries/useJwtToken', () => ({
  useJwtToken: jest.fn(),
}));

jest.mock('@/hooks/queries/usePdsUrl', () => ({
  usePdsUrl: jest.fn(),
}));

jest.mock('@/bluesky-api', () => ({
  BlueskyApi: jest.fn(() => ({
    getActorGalleries: mockGetActorGalleries,
    getActorGrainGalleryItems: mockGetActorGrainGalleryItems,
    getActorGrainPhotos: mockGetActorGrainPhotos,
    getActorGrainPhotoExif: mockGetActorGrainPhotoExif,
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

beforeEach(() => {
  jest.clearAllMocks();
  (useJwtToken as jest.Mock).mockReturnValue({ data: 'token' });
  (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: false });
});

describe('useGrainGalleries query hook', () => {

  it('fetches galleries and flattens pages across fetchNextPage', async () => {
    mockGetActorGalleries
      .mockResolvedValueOnce({ records: [{ uri: 'a' }], cursor: 'next' })
      .mockResolvedValueOnce({ records: [{ uri: 'b' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainGalleries('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorGalleries).toHaveBeenCalledWith('token', 'alice', 5, undefined);
    expect(result.current.data).toEqual([{ uri: 'a' }]);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ uri: 'a' }, { uri: 'b' }]);
    });
    expect(mockGetActorGalleries).toHaveBeenLastCalledWith('token', 'alice', 5, 'next');
  });

  it('uses the default limit of 30 when none is provided', async () => {
    mockGetActorGalleries.mockResolvedValueOnce({ records: [], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainGalleries('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorGalleries).toHaveBeenCalledWith('token', 'alice', 30, undefined);
  });

  it('is disabled when there is no token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainGalleries('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorGalleries).not.toHaveBeenCalled();
  });

  it('is disabled when there is no identifier', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainGalleries(undefined, 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorGalleries).not.toHaveBeenCalled();
  });

  it('is disabled when the PDS URL is missing', async () => {
    (usePdsUrl as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainGalleries('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorGalleries).not.toHaveBeenCalled();
  });

  it('is disabled while the PDS URL is still loading', async () => {
    (usePdsUrl as jest.Mock).mockReturnValue({ data: 'https://pds', isLoading: true });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainGalleries('alice', 5), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorGalleries).not.toHaveBeenCalled();
  });
});

describe('useGrainGalleryItems query hook', () => {
  it('paginates and accumulates items until the cursor runs out', async () => {
    mockGetActorGrainGalleryItems
      .mockResolvedValueOnce({ records: [{ uri: 'i1' }], cursor: 'c1' })
      .mockResolvedValueOnce({ records: [{ uri: 'i2' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainGalleryItems('alice', 50), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorGrainGalleryItems).toHaveBeenNthCalledWith(1, 'token', 'alice', 50, undefined);
    expect(mockGetActorGrainGalleryItems).toHaveBeenNthCalledWith(2, 'token', 'alice', 50, 'c1');
    expect(result.current.data).toEqual([{ uri: 'i1' }, { uri: 'i2' }]);
  });

  it('is disabled without a token', async () => {
    (useJwtToken as jest.Mock).mockReturnValue({ data: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainGalleryItems('alice'), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorGrainGalleryItems).not.toHaveBeenCalled();
  });
});

describe('useGrainPhotos query hook', () => {
  it('paginates and accumulates photos until the cursor runs out', async () => {
    mockGetActorGrainPhotos
      .mockResolvedValueOnce({ records: [{ uri: 'p1' }], cursor: 'c1' })
      .mockResolvedValueOnce({ records: [{ uri: 'p2' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainPhotos('alice', 50), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([{ uri: 'p1' }, { uri: 'p2' }]);
  });

  it('is disabled when the identifier is missing', async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainPhotos(undefined), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
    expect(mockGetActorGrainPhotos).not.toHaveBeenCalled();
  });
});

describe('useGrainPhotoExif query hook', () => {
  it('fetches a single page of exif records', async () => {
    mockGetActorGrainPhotoExif.mockResolvedValueOnce({ records: [{ uri: 'x1' }], cursor: undefined });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useGrainPhotoExif('alice', 50), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockGetActorGrainPhotoExif).toHaveBeenCalledWith('token', 'alice', 50, undefined);
    expect(result.current.data).toEqual([{ uri: 'x1' }]);
  });
});

describe('grain helper functions', () => {
  it('indexGrainPhotosByUri maps photos by uri and tolerates undefined', () => {
    expect(indexGrainPhotosByUri(undefined).size).toBe(0);
    const map = indexGrainPhotosByUri([
      { uri: 'a' },
      { uri: 'b' },
    ] as never);
    expect(map.get('a')).toEqual({ uri: 'a' });
    expect(map.size).toBe(2);
  });

  it('indexGrainExifByPhotoUri keys by the described photo uri, skipping records without one', () => {
    expect(indexGrainExifByPhotoUri(undefined).size).toBe(0);
    const map = indexGrainExifByPhotoUri([
      { uri: 'exif1', value: { photo: 'photoA' } },
      { uri: 'exif2', value: {} },
    ] as never);
    expect(map.get('photoA')).toEqual({ uri: 'exif1', value: { photo: 'photoA' } });
    expect(map.size).toBe(1);
  });

  it('groupGalleryItems buckets by gallery uri and sorts each bucket by position', () => {
    expect(groupGalleryItems(undefined).size).toBe(0);
    const map = groupGalleryItems([
      { uri: 'i1', value: { gallery: 'g1', position: 2 } },
      { uri: 'i2', value: { gallery: 'g1', position: 1 } },
      { uri: 'i3', value: { gallery: 'g2' } },
    ] as never);
    expect(map.get('g1')?.map((item) => item.uri)).toEqual(['i2', 'i1']);
    expect(map.get('g2')?.map((item) => item.uri)).toEqual(['i3']);
  });
});
