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
 * STUB — returns a deterministic fake note for a sliver of posts so the
 * UI surface is exercisable end-to-end (panel, rate sheet, sources)
 * without a backend. When a real lexicon ships, replace the body of
 * this query with the XRPC call; the calling sites don't need to
 * change.
 */
export function useCommunityNote(postUri: string | undefined) {
  return useQuery<CommunityNote | null>({
    queryKey: ['communityNote', postUri] as const,
    enabled: !!postUri,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!postUri) return null;
      // Deterministic 1-in-7 hit so a feed scroll shows a handful of
      // notes interleaved with normal posts. Hash the URI so the same
      // post always behaves the same way.
      let h = 0;
      for (let i = 0; i < postUri.length; i++) h = (h * 31 + postUri.charCodeAt(i)) | 0;
      const bucket = Math.abs(h) % 7;
      if (bucket !== 0) return null;
      const helpfulPercent = 60 + (Math.abs(h) % 35);
      const ratingCount = 12 + (Math.abs(h) % 380);
      const status: CommunityNote['status'] =
        helpfulPercent >= 80 ? 'currentlyRatedHelpful' : 'needsMoreRatings';
      return {
        id: `stub-note-${Math.abs(h)}`,
        postUri,
        body:
          'Readers like you have flagged this post for missing context. The original claim oversimplifies what the underlying study reports — figure was a per-region rate, not a national one. See sources for the full breakdown.',
        helpfulPercent,
        ratingCount,
        sources: [
          'https://example.org/methodology',
          'https://example.org/full-report',
        ],
        createdAt: new Date(Date.now() - (Math.abs(h) % 86_400_000) * 4).toISOString(),
        status,
      };
    },
  });
}
