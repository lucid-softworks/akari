import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { FlashesStoryRecord, SprkStoryRecord } from '@/bluesky-api';
import type { LightboxImage } from '@/components/ui/Lightbox';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForPdsUrl } from '@/utils/blueskyApi';
import { buildStoryBlobUrl, findStoryImageBlob } from '@/utils/storyMedia';

/** 24h — the Flashes lexicon default, and the convention we assume for Spark (which has no expiry field). */
const DEFAULT_EXPIRY_MINUTES = 1440;

type NormalizedStory = {
  uri: string;
  createdAt: string;
  expiryMinutes: number;
  value: unknown;
};

function isActive(story: NormalizedStory, now: number): boolean {
  const created = Date.parse(story.createdAt);
  if (Number.isNaN(created)) return false;
  return created + story.expiryMinutes * 60_000 > now;
}

/**
 * An actor's currently-active ephemeral "stories" across the apps akari
 * understands — Flashes (`blue.flashes.story.post`) and Spark
 * (`so.sprk.story.post`) — resolved to Lightbox-ready image URLs and
 * filtered to the non-expired ones. Returns empty when the actor has none,
 * so the profile avatar can simply skip the ring.
 *
 * Only image media surfaces here; a video-only Spark story produces no
 * Lightbox image (the image Lightbox can't play it) and so doesn't ring.
 */
export function useUserStories(identifier: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: pdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);
  const enabled = !!identifier && !!pdsUrl && !isPdsLoading;

  const flashes = useQuery({
    queryKey: queryKeys.author.flashesStories(identifier, pdsUrl),
    queryFn: async () => {
      const api = apiForPdsUrl(pdsUrl as string);
      const response = await api.getActorFlashesStories(token ?? '', identifier as string, 50);
      return response.records;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const spark = useQuery({
    queryKey: queryKeys.author.sparkStories(identifier, pdsUrl),
    queryFn: async () => {
      const api = apiForPdsUrl(pdsUrl as string);
      const response = await api.getActorSparkStories(token ?? '', identifier as string, 50);
      return response.records;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const images = useMemo<LightboxImage[]>(() => {
    if (!pdsUrl) return [];
    const now = Date.now();

    const normalized: NormalizedStory[] = [
      ...((flashes.data ?? []) as FlashesStoryRecord[]).map((record) => ({
        uri: record.uri,
        createdAt: record.value.createdAt,
        expiryMinutes: record.value.expiresInMinutes ?? DEFAULT_EXPIRY_MINUTES,
        value: record.value,
      })),
      ...((spark.data ?? []) as SprkStoryRecord[]).map((record) => ({
        uri: record.uri,
        createdAt: record.value.createdAt,
        expiryMinutes: DEFAULT_EXPIRY_MINUTES,
        value: record.value,
      })),
    ];

    return normalized
      .filter((story) => isActive(story, now))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .flatMap((story) => {
        const did = story.uri.split('/')[2];
        const blob = did ? findStoryImageBlob(story.value) : undefined;
        if (!did || !blob) return [];
        return [
          {
            url: buildStoryBlobUrl(pdsUrl, did, blob.cid),
            mimeType: blob.mimeType,
            sizeBytes: blob.size,
          } satisfies LightboxImage,
        ];
      });
  }, [flashes.data, spark.data, pdsUrl]);

  return { images, hasActiveStory: images.length > 0 };
}
