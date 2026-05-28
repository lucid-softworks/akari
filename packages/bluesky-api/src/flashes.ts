import { BlueskyApiClient } from './client';

/**
 * Minimal client for the `blue.flashes.*` lexicons (Flashes — an
 * Instagram-style "stories" app on AT Protocol). We only implement the
 * read path the profile avatar needs: list a user's story records so we
 * can show a ring + open the image. Story blobs live on the user's PDS
 * and are fetched PDS-direct via `com.atproto.sync.getBlob`.
 */

export type FlashesStoryRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'blue.flashes.story.post';
    image: {
      $type: 'blob';
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
    createdAt: string;
    /** Optional text overlay on the story. */
    text?: string;
    facets?: unknown[];
    /** Minutes until expiry; defaults to 1440 (24h) per the lexicon. */
    expiresInMinutes?: number;
  };
};

export type FlashesStoryRecordsResponse = {
  records: FlashesStoryRecord[];
  cursor?: string;
};

export class BlueskyFlashes extends BlueskyApiClient {
  /**
   * Lists `blue.flashes.story.post` records on the actor's repo. Returns
   * empty when the actor doesn't use Flashes (or the listing fails), so
   * callers can simply skip the story ring. `accessJwt` may be empty —
   * `listRecords` is a public read.
   */
  async getActorStories(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<FlashesStoryRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'blue.flashes.story.post',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;

    try {
      return await this.makeAuthenticatedRequest<FlashesStoryRecordsResponse>(
        '/com.atproto.repo.listRecords',
        accessJwt,
        { params },
      );
    } catch {
      return { records: [], cursor: undefined };
    }
  }
}
