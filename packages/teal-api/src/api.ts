import { BlueskyApiClient } from 'bluesky-api';

import type { TealListRecordsResponse, TealPlayRecord } from './types';

const TEAL_COLLECTION = 'fm.teal.alpha.feed.play';

export class TealApi extends BlueskyApiClient {
  async getLatestPlay(accessJwt: string, did: string): Promise<TealPlayRecord | null> {
    const response = await this.makeAuthenticatedRequest<TealListRecordsResponse>(
      '/com.atproto.repo.listRecords',
      accessJwt,
      {
        params: {
          repo: did,
          collection: TEAL_COLLECTION,
          limit: '1',
        },
      },
    );

    if (!response.records?.length) {
      return null;
    }

    const [latest] = response.records;

    if (!latest?.value) {
      return null;
    }

    return latest.value;
  }
}

export { TEAL_COLLECTION };
