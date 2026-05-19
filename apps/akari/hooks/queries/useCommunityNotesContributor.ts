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
 * STUB — posts flagged by readers as needing a Community Note. Returns
 * a small canned list so the contributor portal's "Pending posts" tab
 * is exercisable end-to-end.
 */
export function usePendingPostsNeedingNotes() {
  return useQuery<PendingPostSummary[]>({
    queryKey: ['communityNotes', 'pendingPosts'] as const,
    staleTime: 60 * 1000,
    queryFn: async () => {
      return [
        {
          uri: 'at://did:plc:stubcontrib1/app.bsky.feed.post/3la',
          cid: 'bafyreigh2akiscaildc7omf7v6h4mockcid000000000000000000000a',
          authorHandle: 'newsbot.example',
          authorDisplayName: 'Daily Wire Bot',
          text:
            'New study claims 80% of remote workers want to go back to the office. Source: trust me bro.',
          requestCount: 17,
          lastRequestedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        },
        {
          uri: 'at://did:plc:stubcontrib2/app.bsky.feed.post/3lb',
          cid: 'bafyreigh2akiscaildc7omf7v6h4mockcid000000000000000000000b',
          authorHandle: 'medfacts.example',
          authorDisplayName: 'Medical Facts Daily',
          text:
            'Drinking 8 glasses of water a day prevents almost all illness, doctors confirm.',
          requestCount: 9,
          lastRequestedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        },
        {
          uri: 'at://did:plc:stubcontrib3/app.bsky.feed.post/3lc',
          cid: 'bafyreigh2akiscaildc7omf7v6h4mockcid000000000000000000000c',
          authorHandle: 'finance.example',
          text:
            'BREAKING: The Federal Reserve just abolished interest rates effective midnight tonight.',
          requestCount: 42,
          lastRequestedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
        },
      ];
    },
  });
}

/**
 * STUB — Community Notes that other contributors have submitted and
 * are awaiting ratings. Mirrors X's "Rating impact" queue.
 */
export function useNotesPendingRating() {
  return useQuery<CommunityNote[]>({
    queryKey: ['communityNotes', 'pendingRating'] as const,
    staleTime: 60 * 1000,
    queryFn: async () => {
      return [
        {
          id: 'stub-pending-1',
          postUri: 'at://did:plc:stubcontrib1/app.bsky.feed.post/3la',
          body:
            'The cited study surveyed 200 managers, not workers — and was sponsored by an office-leasing firm. See linked methodology.',
          helpfulPercent: 0,
          ratingCount: 4,
          sources: ['https://example.org/methodology'],
          createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
          status: 'needsMoreRatings',
        },
        {
          id: 'stub-pending-2',
          postUri: 'at://did:plc:stubcontrib2/app.bsky.feed.post/3lb',
          body:
            'There is no medical consensus that 8 glasses is universally required — needs vary by body mass, activity, and climate.',
          helpfulPercent: 0,
          ratingCount: 2,
          sources: [
            'https://example.org/hydration-review',
            'https://example.org/who-guidance',
          ],
          createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          status: 'needsMoreRatings',
        },
      ];
    },
  });
}

/**
 * STUB — your contributor profile: enrollment date, notes written,
 * helpfulness rate, recent activity.
 */
export function useMyContributorProfile() {
  return useQuery<ContributorProfileSummary>({
    queryKey: ['communityNotes', 'myProfile'] as const,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      return {
        notesWritten: 12,
        helpfulRate: 74,
        ratingsGiven: 87,
        joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 32).toISOString(),
        recentNotes: [
          {
            id: 'stub-mine-1',
            postUri: 'at://did:plc:stubpost1/app.bsky.feed.post/3za',
            body:
              'The chart in the original post truncates the y-axis starting at 70%, exaggerating the apparent decline.',
            helpfulPercent: 82,
            ratingCount: 26,
            sources: ['https://example.org/chart-design-guidance'],
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            status: 'currentlyRatedHelpful',
          },
          {
            id: 'stub-mine-2',
            postUri: 'at://did:plc:stubpost2/app.bsky.feed.post/3zb',
            body:
              'The video is from 2019, not from today as captioned. Original upload linked below.',
            helpfulPercent: 91,
            ratingCount: 47,
            sources: ['https://example.org/original-clip'],
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            status: 'currentlyRatedHelpful',
          },
        ],
      };
    },
  });
}
