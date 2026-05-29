import { useCallback, useEffect, useState } from 'react';

import {
  EMPTY_POLL_DRAFT,
  MIN_POLL_OPTIONS,
  type PollDraft,
} from '@/utils/postComposer/types';

type UseComposerPollParams = {
  /** Whether the composer is currently visible; clears the poll on close. */
  visible: boolean;
  /** Disables attaching a poll (media/quote present or long mode). */
  pollDisabled: boolean;
};

type UseComposerPollResult = {
  poll: PollDraft | null;
  setPoll: (next: PollDraft | null) => void;
  togglePoll: () => void;
  pollDisabled: boolean;
  /** A poll with enough filled options to be publishable. */
  hasValidPoll: boolean;
  /** A poll is attached but not yet valid; this blocks sending. */
  pollIncomplete: boolean;
};

/**
 * Owns the composer's optional poll: its draft state, the reset-on-close
 * effect, the toggle handler, and the derived validity flags used for send
 * gating. Extracted verbatim from PostComposer; behavior is unchanged.
 */
export function useComposerPoll({
  visible,
  pollDisabled,
}: UseComposerPollParams): UseComposerPollResult {
  const [poll, setPoll] = useState<PollDraft | null>(null);

  // Clear any attached poll when the composer closes so the next open starts
  // fresh (mirrors the other reset-on-open state).
  useEffect(() => {
    if (!visible) setPoll(null);
  }, [visible]);

  const togglePoll = useCallback(() => {
    setPoll((prev) => (prev ? null : EMPTY_POLL_DRAFT));
  }, []);

  const filledPollOptions = poll ? poll.options.filter((o) => o.trim().length > 0).length : 0;
  const hasValidPoll = !!poll && filledPollOptions >= MIN_POLL_OPTIONS;
  const pollIncomplete = !!poll && !hasValidPoll;

  return { poll, setPoll, togglePoll, pollDisabled, hasValidPoll, pollIncomplete };
}
