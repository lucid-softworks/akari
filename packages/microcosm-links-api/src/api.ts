import { MicrocosmApiClient } from './client';
import type {
  MicrocosmBacklinksQuery,
  MicrocosmBacklinksResponse,
  MicrocosmManyToManyCountsQuery,
  MicrocosmManyToManyCountsResponse,
} from './types';

const BACKLINKS_ENDPOINT = '/xrpc/blue.microcosm.links.getBacklinks';
const MANY_TO_MANY_ENDPOINT = '/xrpc/blue.microcosm.links.getManyToManyCounts';

export class MicrocosmLinksApi extends MicrocosmApiClient {
  async getBacklinks(query: MicrocosmBacklinksQuery): Promise<MicrocosmBacklinksResponse> {
    const { subject, source, limit, cursor, did } = query;

    return this.get<MicrocosmBacklinksResponse>(BACKLINKS_ENDPOINT, {
      subject,
      source,
      limit,
      cursor,
      did,
    });
  }

  async getManyToManyCounts(
    query: MicrocosmManyToManyCountsQuery,
  ): Promise<MicrocosmManyToManyCountsResponse> {
    const { subject, source, pathToOther, limit, cursor, did, otherSubject } = query;

    return this.get<MicrocosmManyToManyCountsResponse>(MANY_TO_MANY_ENDPOINT, {
      subject,
      source,
      pathToOther,
      limit,
      cursor,
      did,
      otherSubject,
    });
  }
}
