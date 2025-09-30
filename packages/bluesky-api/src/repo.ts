import { BlueskyApiClient } from './client';
import type { BlueskyRepoListRecordsQuery, BlueskyRepoListRecordsResponse } from './types';

export class BlueskyRepo extends BlueskyApiClient {
  /**
   * Lists records from a repository collection using the AT Protocol repo.listRecords endpoint.
   * @param query - Parameters describing which repository and collection to read plus pagination options.
   * @returns Paginated records returned by the server typed to the supplied record shape.
   */
  async listRecords<TValue = Record<string, unknown>>(
    query: BlueskyRepoListRecordsQuery,
  ): Promise<BlueskyRepoListRecordsResponse<TValue>> {
    const { collection, repo, cursor, limit, rkeyStart, rkeyEnd, reverse } = query;

    const params: Record<string, string> = {
      collection,
      repo,
    };

    if (cursor) params.cursor = cursor;
    if (typeof limit === 'number') params.limit = String(limit);
    if (rkeyStart) params.rkeyStart = rkeyStart;
    if (rkeyEnd) params.rkeyEnd = rkeyEnd;
    if (typeof reverse === 'boolean') params.reverse = reverse ? 'true' : 'false';

    return this.makeRequest<BlueskyRepoListRecordsResponse<TValue>>('/com.atproto.repo.listRecords', {
      params,
    });
  }
}
