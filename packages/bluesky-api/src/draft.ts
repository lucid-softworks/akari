import { BlueskyApiClient } from './client';
import type {
  BlueskyCreateDraftResponse,
  BlueskyDraft,
  BlueskyGetDraftsResponse,
} from './types';

/**
 * Drafts are stored in the user's private "stash" via the appview proxy.
 * All four endpoints require authentication; create/update/delete also
 * require an `atproto-proxy` header pointing at the appview, like the
 * chat endpoints.
 *
 * Lexicon: `app.bsky.draft.{getDrafts,createDraft,updateDraft,deleteDraft}`.
 */
export class BlueskyDrafts extends BlueskyApiClient {
  /** Lists drafts. Newest-first is up to the server; we don't sort here. */
  async getDrafts(
    accessJwt: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<BlueskyGetDraftsResponse> {
    const params: Record<string, string> = {};
    if (options.limit !== undefined) params.limit = String(options.limit);
    if (options.cursor) params.cursor = options.cursor;
    return this.makeAuthenticatedRequest<BlueskyGetDraftsResponse>(
      '/app.bsky.draft.getDrafts',
      accessJwt,
      { params },
    );
  }

  /**
   * Creates a draft. The server returns the assigned id (a TID). May
   * throw with `errorCode === 'DraftLimitReached'` when the user is over
   * the per-account limit.
   */
  async createDraft(
    accessJwt: string,
    draft: BlueskyDraft,
  ): Promise<BlueskyCreateDraftResponse> {
    return this.makeAuthenticatedRequest<BlueskyCreateDraftResponse>(
      '/app.bsky.draft.createDraft',
      accessJwt,
      { method: 'POST', body: { draft } },
    );
  }

  /**
   * Updates a draft in place. Per the lexicon, updates targeting a
   * non-existent id are silently ignored — that's intentional, so we
   * don't need to retry on 4xx.
   */
  async updateDraft(
    accessJwt: string,
    id: string,
    draft: BlueskyDraft,
  ): Promise<void> {
    await this.makeAuthenticatedRequest<void>(
      '/app.bsky.draft.updateDraft',
      accessJwt,
      { method: 'POST', body: { draft: { id, draft } } },
    );
  }

  async deleteDraft(accessJwt: string, id: string): Promise<void> {
    await this.makeAuthenticatedRequest<void>(
      '/app.bsky.draft.deleteDraft',
      accessJwt,
      { method: 'POST', body: { id } },
    );
  }
}
