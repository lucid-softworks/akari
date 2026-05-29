import { useMutation } from '@tanstack/react-query';

export type SubmitCommunityNoteInput = {
  /** URI of the post the note is attached to. */
  postUri: string;
  /** Note body — prose the contributor wrote. */
  body: string;
  /** URLs the contributor cites in support of the note. */
  sources: string[];
  /** What the contributor believes is wrong / missing from the post. */
  classification:
    | 'misleading'
    | 'missingContext'
    | 'outdated'
    | 'satire'
    | 'other';
};

export type RequestCommunityNoteInput = {
  postUri: string;
  reason:
    | 'misinformation'
    | 'missingContext'
    | 'manipulation'
    | 'spam'
    | 'other';
  comment?: string;
};

/**
 * STUB — accepts a contributor-authored Community Note for a post. Logs
 * the payload and fakes 350ms latency so the submit button's pending
 * state is observable. Swap for the real XRPC call when a lexicon ships.
 */
export function useSubmitCommunityNote() {
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation -- stub: no backing query to invalidate until a lexicon ships
  return useMutation({
    mutationFn: async (input: SubmitCommunityNoteInput) => {
      await new Promise((r) => setTimeout(r, 350));
      // eslint-disable-next-line no-console
      console.log('[stub useSubmitCommunityNote]', input);
      return { ok: true } as const;
    },
  });
}

/**
 * STUB — flags a post as needing a Community Note. Distinct from
 * submitting one — readers without contributor access can still raise
 * the flag, mirroring X's "Request a Note" affordance.
 */
export function useRequestCommunityNote() {
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation -- stub: no backing query to invalidate until a lexicon ships
  return useMutation({
    mutationFn: async (input: RequestCommunityNoteInput) => {
      await new Promise((r) => setTimeout(r, 250));
      // eslint-disable-next-line no-console
      console.log('[stub useRequestCommunityNote]', input);
      return { ok: true } as const;
    },
  });
}
