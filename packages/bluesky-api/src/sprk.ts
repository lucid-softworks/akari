import { BlueskyApiClient } from './client';

/**
 * Minimal client for the `so.sprk.*` lexicons (Spark — another
 * stories-style app on AT Protocol). We only implement the read path the
 * profile avatar needs: list a user's story records. `media` is a union of
 * `so.sprk.media.image` / `so.sprk.media.video`; we keep it untyped here
 * and pull the image blob out client-side, since the media sub-lexicons
 * aren't modelled in this package.
 */

export type SprkStoryRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'so.sprk.story.post';
    media: unknown;
    sound?: unknown;
    embeds?: unknown;
    labels?: unknown;
    createdAt: string;
  };
};

export type SprkStoryRecordsResponse = {
  records: SprkStoryRecord[];
  cursor?: string;
};

export class BlueskySpark extends BlueskyApiClient {
  /**
   * Lists `so.sprk.story.post` records on the actor's repo. Returns empty
   * for actors that don't use Spark (or on failure), so callers can skip
   * the story ring. `accessJwt` may be empty — `listRecords` is public.
   */
  async getActorStories(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<SprkStoryRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'so.sprk.story.post',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;

    try {
      return await this.makeAuthenticatedRequest<SprkStoryRecordsResponse>(
        '/com.atproto.repo.listRecords',
        accessJwt,
        { params },
      );
    } catch {
      return { records: [], cursor: undefined };
    }
  }
}
