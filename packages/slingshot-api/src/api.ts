import { SlingshotApiClient } from './client';
import type {
  SlingshotGetRecordQuery,
  SlingshotRecordResponse,
  SlingshotResolveHandleResponse,
} from './types';

export class SlingshotApi extends SlingshotApiClient {
  /**
   * Fetch one record (by repo + collection + rkey) from slingshot's edge
   * cache. Returns the standard `com.atproto.repo.getRecord` envelope.
   */
  async getRecord<T = unknown>(query: SlingshotGetRecordQuery): Promise<SlingshotRecordResponse<T>> {
    const { repo, collection, rkey } = query;
    return this.get<SlingshotRecordResponse<T>>('/xrpc/com.atproto.repo.getRecord', {
      repo,
      collection,
      rkey,
    });
  }

  /** Resolve a handle to its DID via `com.atproto.identity.resolveHandle`. */
  async resolveHandle(handle: string): Promise<SlingshotResolveHandleResponse> {
    return this.get<SlingshotResolveHandleResponse>('/xrpc/com.atproto.identity.resolveHandle', {
      handle,
    });
  }
}
