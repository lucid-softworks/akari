import { BlueskyApiClient } from './client';
import type { BlueskyTangledReposResponse, BlueskyWhtwndEntriesResponse } from './types';

/**
 * Bluesky API methods for interacting with Tangled repo records.
 */
export class BlueskyRepos extends BlueskyApiClient {
  /**
   * Lists Tangled repos created by the specified actor.
   * @param accessJwt - Valid access JWT token for the authenticated user.
   * @param repo - DID or handle identifying the actor whose repos should be loaded.
   * @param limit - Number of repos to fetch per page (default: 50).
   * @param cursor - Optional pagination cursor returned by previous calls.
   * @returns Promise resolving to Tangled repo records for the actor.
   */
  async getActorRepos(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyTangledReposResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'sh.tangled.repo',
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyTangledReposResponse>('/com.atproto.repo.listRecords', accessJwt, {
      params,
    });
  }

  /**
   * Lists Whtwnd blog entries created by the specified actor.
   * @param accessJwt - Valid access JWT token for the authenticated user.
   * @param repo - DID or handle identifying the actor whose blog entries should be loaded.
   * @param limit - Number of entries to fetch per page (default: 25).
   * @param cursor - Optional pagination cursor returned by previous calls.
   * @returns Promise resolving to Whtwnd blog entries for the actor.
   */
  async getAuthorWhtwndPosts(
    accessJwt: string,
    repo: string,
    limit: number = 25,
    cursor?: string,
  ): Promise<BlueskyWhtwndEntriesResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'com.whtwnd.blog.entry',
      limit: limit.toString(),
      reverse: 'true',
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyWhtwndEntriesResponse>('/com.atproto.repo.listRecords', accessJwt, {
      params,
    });
  }
}
