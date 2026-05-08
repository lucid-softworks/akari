import { BlueskyApiClient } from './client';
import type { BlueskyLinkatBoardResponse, BlueskyTangledReposResponse, BlueskyRecipeRecordsResponse, CreateReviewInput, BlueskyCreatePostResponse } from './types';

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
   * Lists recipe records created by the specified actor.
   * @param accessJwt - Valid access JWT token for the authenticated user.
   * @param repo - DID or handle identifying the actor whose recipes should be loaded.
   * @param limit - Number of recipes to fetch per page (default: 50).
   * @param cursor - Optional pagination cursor returned by previous calls.
   * @returns Promise resolving to recipe records for the actor.
   */
  async getActorRecipes(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyRecipeRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'exchange.recipe.recipe',
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyRecipeRecordsResponse>('/com.atproto.repo.listRecords', accessJwt, {
      params,
    });
  }

  /**
   * Lists Blue.linkat.board records for the specified actor.
   * @param accessJwt - Valid access JWT token for the authenticated user.
   * @param repo - DID or handle identifying the actor whose link boards should be loaded.
   * @param limit - Number of records to fetch per page (default: 50).
   * @param cursor - Optional pagination cursor returned by previous calls.
   * @returns Promise resolving to Blue.linkat.board records for the actor.
   */
  async getActorLinkatBoards(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyLinkatBoardResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'blue.linkat.board',
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    try {
      return await this.makeAuthenticatedRequest<BlueskyLinkatBoardResponse>('/com.atproto.repo.listRecords', accessJwt, {
        params,
      });
    } catch {
      // If the collection doesn't exist or there's an error, return empty response
      return {
        records: [],
        cursor: undefined,
      };
    }
  }

  /**
   * Creates a review record in the social.popfeed.feed.review collection.
   * @param accessJwt - Valid access JWT token for the authenticated user.
   * @param userDid - DID of the repository where the review should be recorded.
   * @param review - Review data including identifiers, rating, and optional metadata.
   * @returns Promise resolving to metadata for the created record including AT URI and commit details.
   */
  async createReview(
    accessJwt: string,
    userDid: string,
    review: CreateReviewInput,
  ): Promise<BlueskyCreatePostResponse> {
    const record: Record<string, unknown> = {
      $type: 'social.popfeed.feed.review',
      identifiers: review.identifiers,
      creativeWorkType: review.creativeWorkType,
      rating: review.rating,
      createdAt: new Date().toISOString(),
    };

    if (review.text !== undefined) {
      record.text = review.text;
    }
    if (review.title !== undefined) {
      record.title = review.title;
    }
    if (review.poster !== undefined) {
      record.poster = review.poster;
    }
    if (review.tags !== undefined) {
      record.tags = review.tags;
    }
    if (review.genres !== undefined) {
      record.genres = review.genres;
    }
    if (review.mainCredit !== undefined) {
      record.mainCredit = review.mainCredit;
    }
    if (review.mainCreditRole !== undefined) {
      record.mainCreditRole = review.mainCreditRole;
    }
    if (review.isRevisit !== undefined) {
      record.isRevisit = review.isRevisit;
    }
    if (review.containsSpoilers !== undefined) {
      record.containsSpoilers = review.containsSpoilers;
    }
    if (review.releaseDate !== undefined) {
      record.releaseDate = review.releaseDate;
    }
    if (review.posterUrl !== undefined) {
      record.posterUrl = review.posterUrl;
    }

    return this.makeAuthenticatedRequest<BlueskyCreatePostResponse>('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'social.popfeed.feed.review',
        record,
      },
    });
  }

  /**
   * Reads the user's `community.lexicon.preference.ai` record (the
   * community-defined AI/ML opt-in lexicon — distinct from
   * `app.bsky.actor.preferences#postInteractionSettingsPref` etc).
   * Returns null if the user has never set one.
   */
  async getAiPreferences(
    accessJwt: string,
    userDid: string,
  ): Promise<AiPreferencesRecord | null> {
    try {
      const response = await this.makeAuthenticatedRequest<{
        uri: string;
        cid: string;
        value: AiPreferencesRecord;
      }>('/com.atproto.repo.getRecord', accessJwt, {
        params: {
          repo: userDid,
          collection: 'community.lexicon.preference.ai',
          rkey: 'self',
        },
      });
      return response.value;
    } catch (error) {
      // The PDS returns 400 RecordNotFound for users without a record.
      const e = error as { errorCode?: string; status?: number };
      if (e.errorCode === 'RecordNotFound' || e.status === 404) return null;
      throw error;
    }
  }

  /**
   * Writes the user's AI preferences record at rkey `self`. The full
   * record is sent — atproto's putRecord replaces, not merges.
   */
  async putAiPreferences(
    accessJwt: string,
    userDid: string,
    record: AiPreferencesRecord,
  ): Promise<{ uri: string; cid: string }> {
    return this.makeAuthenticatedRequest<{ uri: string; cid: string }>(
      '/com.atproto.repo.putRecord',
      accessJwt,
      {
        method: 'POST',
        body: {
          repo: userDid,
          collection: 'community.lexicon.preference.ai',
          rkey: 'self',
          record,
        },
      },
    );
  }
}

/** Per-category opt-in flag for AI preferences. */
export type AiPreferenceFlag = {
  allow: boolean;
  updatedAt: string;
};

/** Categories defined by `community.lexicon.preference.ai`. */
export type AiPreferenceCategory = 'embedding' | 'inference' | 'syntheticContent' | 'training';

export type AiPreferencesRecord = {
  $type: 'community.lexicon.preference.ai';
  preferences: Record<AiPreferenceCategory, AiPreferenceFlag>;
  scope: { $type: 'community.lexicon.preference.ai#globalScope' };
  updatedAt: string;
};
