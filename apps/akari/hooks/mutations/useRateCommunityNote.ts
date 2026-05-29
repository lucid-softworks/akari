import { useMutation } from '@tanstack/react-query';

export type CommunityNoteHelpfulness = 'helpful' | 'somewhatHelpful' | 'notHelpful';

export type CommunityNoteRateInput = {
  noteId: string;
  helpfulness: CommunityNoteHelpfulness;
  /** Reason codes the user ticked in the rating sheet — open set. */
  reasons: string[];
  /** Optional free-text feedback. */
  comment?: string;
};

/**
 * STUB — fakes a successful rate submission. Logs the payload so the
 * developer can sanity-check the rate-sheet wiring, and resolves after
 * a short delay so the spinner state is visible. Swap the mutationFn
 * body for the real XRPC call once a lexicon exists.
 */
export function useRateCommunityNote() {
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation -- stub: no backing query to invalidate until a lexicon ships
  return useMutation({
    mutationFn: async (input: CommunityNoteRateInput) => {
      await new Promise((r) => setTimeout(r, 350));
      // eslint-disable-next-line no-console
      console.log('[stub useRateCommunityNote]', input);
      return { ok: true } as const;
    },
  });
}
