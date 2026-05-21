import { useQuery } from '@tanstack/react-query';

import { type CommunityNote } from '@/hooks/queries/useCommunityNote';

export type PendingPostSummary = {
  uri: string;
  cid: string;
  authorHandle: string;
  authorDisplayName?: string;
  text: string;
  /** Number of reader-submitted note requests against this post. */
  requestCount: number;
  /** ISO timestamp of the most recent request. */
  lastRequestedAt: string;
};

export type ContributorProfileSummary = {
  /** Total notes the user has authored. */
  notesWritten: number;
  /** % of authored notes that reached "currently rated helpful". */
  helpfulRate: number;
  /** Total ratings the user has cast on other contributors' notes. */
  ratingsGiven: number;
  /** ISO timestamp when the contributor enrolled. */
  joinedAt: string;
  /** Last 5 notes the contributor authored, most recent first. */
  recentNotes: CommunityNote[];
};

/**
 * Posts flagged by readers as needing a Community Note. Empty until a
 * real atproto lexicon ships; the calling site already renders an
 * empty-state placeholder.
 */
export function usePendingPostsNeedingNotes() {
  return useQuery<PendingPostSummary[]>({
    queryKey: ['communityNotes', 'pendingPosts'] as const,
    staleTime: 60 * 1000,
    queryFn: async () => [],
  });
}

/**
 * Community Notes other contributors have submitted and are awaiting
 * ratings. Empty until the rating lexicon ships.
 */
export function useNotesPendingRating() {
  return useQuery<CommunityNote[]>({
    queryKey: ['communityNotes', 'pendingRating'] as const,
    staleTime: 60 * 1000,
    queryFn: async () => [],
  });
}

/**
 * The signed-in user's contributor profile. Returns a zeroed summary
 * (no notes, no ratings, enrollment timestamp = now) until a real
 * contributor lexicon backs this.
 */
export function useMyContributorProfile() {
  return useQuery<ContributorProfileSummary>({
    queryKey: ['communityNotes', 'myProfile'] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => ({
      notesWritten: 0,
      helpfulRate: 0,
      ratingsGiven: 0,
      joinedAt: new Date().toISOString(),
      recentNotes: [],
    }),
  });
}
