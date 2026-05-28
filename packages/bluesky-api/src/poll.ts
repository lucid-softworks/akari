import { BlueskyApiClient } from './client';

/**
 * Client for the `tech.tokimeki.poll.*` lexicons (Tokimeki polls on AT
 * Protocol). A poll is a `tech.tokimeki.poll.poll` record (2-4 options +
 * endsAt) attached to a post via `app.bsky.embed.external` whose `uri` is
 * the poll record's at:// URI. Votes are `tech.tokimeki.poll.vote` records
 * referencing the poll by strongRef. We implement the write paths
 * (creating polls + votes); reading a poll and tallying votes happen
 * client-side via slingshot + constellation.
 */

export type PollStrongRef = { uri: string; cid: string };

export type PollRecordValue = {
  $type: 'tech.tokimeki.poll.poll';
  /** 2-4 choices. */
  options: string[];
  /** When the poll closes for voting. */
  endsAt: string;
  createdAt: string;
  /** Optional back-reference to the post the poll is attached to. */
  subject?: { $type: 'com.atproto.repo.strongRef'; uri: string; cid: string };
};

export type PollRecord = {
  uri: string;
  cid: string;
  value: PollRecordValue;
};

export type PollVoteRecordValue = {
  $type: 'tech.tokimeki.poll.vote';
  poll: { $type: 'com.atproto.repo.strongRef'; uri: string; cid: string };
  /** Index of the selected option (0-3). */
  optionIndex: number;
  createdAt: string;
};

export type PollVoteRecord = {
  uri: string;
  cid: string;
  value: PollVoteRecordValue;
};

export type PollCreateRecordResponse = { uri: string; cid: string };

export class BlueskyPoll extends BlueskyApiClient {
  /**
   * Creates a `tech.tokimeki.poll.poll` record on the user's repo. Returns
   * its `{ uri, cid }` so the caller can attach it to a post via an
   * external embed.
   */
  async createPoll(
    accessJwt: string,
    repo: string,
    input: { options: string[]; endsAt: string },
  ): Promise<PollCreateRecordResponse> {
    const record: PollRecordValue = {
      $type: 'tech.tokimeki.poll.poll',
      options: input.options,
      endsAt: input.endsAt,
      createdAt: new Date().toISOString(),
    };
    return this.makeAuthenticatedRequest<PollCreateRecordResponse>(
      '/com.atproto.repo.createRecord',
      accessJwt,
      { method: 'POST', body: { repo, collection: 'tech.tokimeki.poll.poll', record } },
    );
  }

  /**
   * Creates a `tech.tokimeki.poll.vote` record on the user's repo, voting
   * for `optionIndex` on the given poll.
   */
  async createVote(
    accessJwt: string,
    repo: string,
    input: { poll: PollStrongRef; optionIndex: number },
  ): Promise<PollCreateRecordResponse> {
    const record: PollVoteRecordValue = {
      $type: 'tech.tokimeki.poll.vote',
      poll: { $type: 'com.atproto.repo.strongRef', uri: input.poll.uri, cid: input.poll.cid },
      optionIndex: input.optionIndex,
      createdAt: new Date().toISOString(),
    };
    return this.makeAuthenticatedRequest<PollCreateRecordResponse>(
      '/com.atproto.repo.createRecord',
      accessJwt,
      { method: 'POST', body: { repo, collection: 'tech.tokimeki.poll.vote', record } },
    );
  }
}
