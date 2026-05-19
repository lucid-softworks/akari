import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { GrainGalleryItemRecord, GrainGalleryRecord, GrainPhotoRecord } from '@/bluesky-api';
import { CursorPageParam } from '@/hooks/queries/types';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForPdsUrl } from '@/utils/blueskyApi';

/**
 * Infinite query for an actor's `social.grain.gallery` records. Returns
 * empty when the actor doesn't use grain.social, so callers can show
 * an empty tab or hide it entirely.
 */
export function useGrainGalleries(identifier: string | undefined, limit: number = 30) {
  const { data: token } = useJwtToken();
  const { data: targetPdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);

  return useInfiniteQuery({
    queryKey: queryKeys.author.grainGalleries(identifier, limit, targetPdsUrl),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!targetPdsUrl) throw new Error('No PDS URL available for target user');

      const api = apiForPdsUrl(targetPdsUrl);
      const response = await api.getActorGalleries(token, identifier, limit, pageParam);

      return {
        galleries: response.records,
        cursor: response.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.galleries),
    enabled: !!identifier && !!token && !!targetPdsUrl && !isPdsLoading,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * One-shot query for an actor's gallery membership records. Used by
 * the gallery detail view to find which photos belong to a gallery
 * (filtered by gallery URI client-side) and to pick a cover image
 * for each gallery in the tab grid (first item by `position`).
 */
export function useGrainGalleryItems(identifier: string | undefined, limit: number = 100) {
  const { data: token } = useJwtToken();
  const { data: targetPdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);

  return useQuery({
    queryKey: queryKeys.author.grainGalleryItems(identifier, targetPdsUrl),
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!targetPdsUrl) throw new Error('No PDS URL available for target user');

      const api = apiForPdsUrl(targetPdsUrl);
      const items: GrainGalleryItemRecord[] = [];
      let cursor: string | undefined;
      // Cap pages so we don't pin a network on the rare profile with
      // thousands of items; the tab is best-effort anyway.
      for (let i = 0; i < 10; i++) {
        const page = await api.getActorGrainGalleryItems(token, identifier, limit, cursor);
        items.push(...page.records);
        if (!page.cursor) break;
        cursor = page.cursor;
      }
      return items;
    },
    enabled: !!identifier && !!token && !!targetPdsUrl && !isPdsLoading,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * One-shot query for all of an actor's `social.grain.photo` records.
 * Used by the gallery detail view to resolve membership URIs into
 * actual photo records (blob ref + alt + aspect).
 */
export function useGrainPhotos(identifier: string | undefined, limit: number = 100) {
  const { data: token } = useJwtToken();
  const { data: targetPdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);

  return useQuery({
    queryKey: queryKeys.author.grainPhotos(identifier, limit, targetPdsUrl),
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!targetPdsUrl) throw new Error('No PDS URL available for target user');

      const api = apiForPdsUrl(targetPdsUrl);
      const photos: GrainPhotoRecord[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 10; i++) {
        const page = await api.getActorGrainPhotos(token, identifier, limit, cursor);
        photos.push(...page.records);
        if (!page.cursor) break;
        cursor = page.cursor;
      }
      return photos;
    },
    enabled: !!identifier && !!token && !!targetPdsUrl && !isPdsLoading,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Convenience: build a `Map<photoUri, GrainPhotoRecord>` from a list,
 * so gallery detail can resolve membership references in O(1).
 */
export function indexGrainPhotosByUri(photos: GrainPhotoRecord[] | undefined): Map<string, GrainPhotoRecord> {
  const map = new Map<string, GrainPhotoRecord>();
  if (!photos) return map;
  for (const photo of photos) map.set(photo.uri, photo);
  return map;
}

/**
 * Convenience: group gallery items by gallery URI, sorted by position.
 * Lets a single fetch feed both the cover-image grid and any gallery
 * detail page that pops up.
 */
export function groupGalleryItems(items: GrainGalleryItemRecord[] | undefined): Map<string, GrainGalleryItemRecord[]> {
  const map = new Map<string, GrainGalleryItemRecord[]>();
  if (!items) return map;
  for (const item of items) {
    const gallery = item.value.gallery;
    const bucket = map.get(gallery);
    if (bucket) bucket.push(item);
    else map.set(gallery, [item]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => (a.value.position ?? 0) - (b.value.position ?? 0));
  }
  return map;
}

export type GrainGalleryWithCover = {
  gallery: GrainGalleryRecord;
  coverUrl: string | null;
  photoCount: number;
};
