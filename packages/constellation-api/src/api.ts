import { ConstellationApiClient } from './client';
import type {
  ConstellationAllLinksQuery,
  ConstellationAllLinksResponse,
  ConstellationCountQuery,
  ConstellationCountResponse,
  ConstellationDistinctDidCountResponse,
  ConstellationDistinctDidsResponse,
  ConstellationLinksQuery,
  ConstellationLinksResponse,
  ConstellationServerInfo,
} from './types';

export class ConstellationApi extends ConstellationApiClient {
  async getServerInfo(): Promise<ConstellationServerInfo> {
    return this.get<ConstellationServerInfo>('/');
  }

  async getLinks(query: ConstellationLinksQuery): Promise<ConstellationLinksResponse> {
    return this.get<ConstellationLinksResponse>('/links', query);
  }

  async getDistinctDids(query: ConstellationLinksQuery): Promise<ConstellationDistinctDidsResponse> {
    return this.get<ConstellationDistinctDidsResponse>('/links/distinct-dids', query);
  }

  async getLinkCount(query: ConstellationCountQuery): Promise<ConstellationCountResponse> {
    return this.get<ConstellationCountResponse>('/links/count', query);
  }

  async getDistinctDidCount(query: ConstellationCountQuery): Promise<ConstellationDistinctDidCountResponse> {
    return this.get<ConstellationDistinctDidCountResponse>('/links/count/distinct-dids', query);
  }

  async getAllLinks(query: ConstellationAllLinksQuery): Promise<ConstellationAllLinksResponse> {
    return this.get<ConstellationAllLinksResponse>('/links/all', query);
  }

  /**
   * Engagement counts for an atproto post URI in the `BlueskyPostView`
   * shape consumers expect: parallel like/repost/reply count lookups.
   * Convenience over `getLinkCount`; failures bubble up via `Promise.all`,
   * so the caller decides whether to swallow them.
   */
  async getPostEngagementCounts(postUri: string): Promise<{
    likeCount: number;
    repostCount: number;
    replyCount: number;
  }> {
    const [likes, reposts, replies] = await Promise.all([
      this.getLinkCount({ target: postUri, collection: 'app.bsky.feed.like', path: '.subject.uri' }),
      this.getLinkCount({ target: postUri, collection: 'app.bsky.feed.repost', path: '.subject.uri' }),
      this.getLinkCount({ target: postUri, collection: 'app.bsky.feed.post', path: '.reply.parent.uri' }),
    ]);
    return { likeCount: likes.total, repostCount: reposts.total, replyCount: replies.total };
  }

  /**
   * AT URIs of records that replied directly to `postUri`. Constellation
   * paginates internally; this returns the first page only, which is the
   * same bounded slice an AppView's `getPostThread` would expose.
   */
  async getReplyUris(postUri: string, limit?: number): Promise<string[]> {
    const res = await this.getLinks({
      target: postUri,
      collection: 'app.bsky.feed.post',
      path: '.reply.parent.uri',
    });
    const records = res.linking_records.slice(0, limit ?? res.linking_records.length);
    return records.map((r) => `at://${r.did}/${r.collection}/${r.rkey}`);
  }
}
