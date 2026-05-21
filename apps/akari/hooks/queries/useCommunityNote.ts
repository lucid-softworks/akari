import { useQuery } from '@tanstack/react-query';

/**
 * A single Community Note attached to a post — mirrors X's
 * "Readers added context" surface. Shape is intentionally minimal here
 * because the real wire format (when atproto ships it) will drive the
 * fields; everything we render today is fed by the stub below.
 */
export type CommunityNote = {
  id: string;
  /** Subject post URI the note is attached to. */
  postUri: string;
  /** The note body, prose written by the rater. */
  body: string;
  /** Percentage of raters who marked the note "helpful" (0–100). */
  helpfulPercent: number;
  /** Number of users who have rated this note. */
  ratingCount: number;
  /** Optional citations (URLs) the rater attached. */
  sources?: string[];
  /** ISO timestamp when the note was first published. */
  createdAt: string;
  /** Status mirrors X's lifecycle: needsMoreRatings → currentlyRatedHelpful → ratingsLocked. */
  status: 'needsMoreRatings' | 'currentlyRatedHelpful' | 'ratingsLocked';
};

/**
 * Returns the Community Note attached to a post, or `null` when none
 * exists. Currently a no-op until a real atproto lexicon ships; the
 * calling sites already handle a `null` result.
 */
export function useCommunityNote(postUri: string | undefined) {
  return useQuery<CommunityNote | null>({
    queryKey: ['communityNote', postUri] as const,
    enabled: !!postUri,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => null,
  });
}
