import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { SifaEducationRecord, SifaPositionRecord, SifaSelfRecord } from '@/bluesky-api';
import { CursorPageParam } from '@/hooks/queries/types';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForPdsUrl } from '@/utils/blueskyApi';

/**
 * Reads the actor's `id.sifa.profile.self` record. Returns null when
 * the actor doesn't have one, so the Resume tab can hide.
 */
export function useSifaSelf(identifier: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: targetPdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);

  return useQuery<SifaSelfRecord | null>({
    queryKey: queryKeys.author.sifaSelf(identifier, targetPdsUrl),
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!targetPdsUrl) throw new Error('No PDS URL available');
      const api = apiForPdsUrl(targetPdsUrl);
      return api.getSifaProfileSelf(token, identifier);
    },
    enabled: !!identifier && !!token && !!targetPdsUrl && !isPdsLoading,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Infinite query for `id.sifa.profile.position` records on the
 * actor's repo. Returned items aren't sorted; the Resume tab sorts
 * by `startedAt` descending so the most recent positions surface first.
 */
export function useSifaPositions(identifier: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: targetPdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);

  return useInfiniteQuery({
    queryKey: queryKeys.author.sifaPositions(identifier, limit, targetPdsUrl),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!targetPdsUrl) throw new Error('No PDS URL available');
      const api = apiForPdsUrl(targetPdsUrl);
      const response = await api.getActorSifaPositions(token, identifier, limit, pageParam);
      return { positions: response.records, cursor: response.cursor };
    },
    select: (data) => data.pages.flatMap((page) => page.positions),
    enabled: !!identifier && !!token && !!targetPdsUrl && !isPdsLoading,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Infinite query for `id.sifa.profile.education` records.
 */
export function useSifaEducation(identifier: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: targetPdsUrl, isLoading: isPdsLoading } = usePdsUrl(identifier);

  return useInfiniteQuery({
    queryKey: queryKeys.author.sifaEducation(identifier, limit, targetPdsUrl),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!targetPdsUrl) throw new Error('No PDS URL available');
      const api = apiForPdsUrl(targetPdsUrl);
      const response = await api.getActorSifaEducation(token, identifier, limit, pageParam);
      return { education: response.records, cursor: response.cursor };
    },
    select: (data) => data.pages.flatMap((page) => page.education),
    enabled: !!identifier && !!token && !!targetPdsUrl && !isPdsLoading,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Convenience: sort positions by start date descending (newest first),
 * with primary positions floated to the top regardless of date so
 * a user's flagged "current position" always reads first.
 */
export function sortSifaPositions(positions: SifaPositionRecord[] | undefined): SifaPositionRecord[] {
  if (!positions) return [];
  return positions.toSorted((a, b) => {
    if (a.value.isPrimary && !b.value.isPrimary) return -1;
    if (!a.value.isPrimary && b.value.isPrimary) return 1;
    return (b.value.startedAt ?? '').localeCompare(a.value.startedAt ?? '');
  });
}

/**
 * Sort education descending by end date (or start date if still
 * enrolled). Most recent credential first.
 */
export function sortSifaEducation(items: SifaEducationRecord[] | undefined): SifaEducationRecord[] {
  if (!items) return [];
  return items.toSorted((a, b) => {
    const aKey = a.value.endedAt ?? a.value.startedAt ?? '';
    const bKey = b.value.endedAt ?? b.value.startedAt ?? '';
    return bKey.localeCompare(aKey);
  });
}
