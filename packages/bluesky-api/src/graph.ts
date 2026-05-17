import { BlueskyApiClient } from './client';
import type {
  BlueskyBlocksResponse,
  BlueskyCreateRecordResponse,
  BlueskyFollowRecordsResponse,
  BlueskyFollowsResponse,
  BlueskyListBlocksResponse,
  BlueskyListMutesResponse,
  BlueskyListResponse,
  BlueskyListView,
  BlueskyListsResponse,
  BlueskyMutesResponse,
} from './types';

/**
 * Bluesky API graph methods (follows, blocks, mutes, etc.)
 */
export class BlueskyGraph extends BlueskyApiClient {
  /**
   * Follows a user. `userDid` is the current user's DID — atproto's
   * createRecord requires `repo` to be a real DID, not the literal "self".
   */
  async followUser(accessJwt: string, userDid: string, did: string) {
    return this.makeAuthenticatedRequest('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.graph.follow',
        record: {
          $type: 'app.bsky.graph.follow',
          subject: did,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Unfollows a user by deleting the follow record. `followUri` is the AT
   * URI returned by the original follow (e.g. `at://<userDid>/app.bsky.graph.follow/<rkey>`);
   * we parse it back into the repo + collection + rkey that deleteRecord wants.
   */
  async unfollowUser(accessJwt: string, followUri: string) {
    const { repo, collection, rkey } = parseAtUri(followUri);
    return this.makeAuthenticatedRequest('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: { repo, collection, rkey },
    });
  }

  /**
   * Blocks a user. See followUser re: the userDid argument.
   */
  async blockUser(accessJwt: string, userDid: string, did: string) {
    return this.makeAuthenticatedRequest('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.graph.block',
        record: {
          $type: 'app.bsky.graph.block',
          subject: did,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Unblocks a user by deleting the block record.
   */
  async unblockUser(accessJwt: string, blockUri: string) {
    const { repo, collection, rkey } = parseAtUri(blockUri);
    return this.makeAuthenticatedRequest('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: { repo, collection, rkey },
    });
  }

  /**
   * Mutes a user
   * @param accessJwt - Valid access JWT token
   * @param actor - The actor's DID or handle to mute
   * @returns Promise resolving to mute operation result
   */
  async muteUser(accessJwt: string, actor: string) {
    return this.makeAuthenticatedRequest('/app.bsky.graph.muteActor', accessJwt, {
      method: 'POST',
      body: {
        actor,
      },
    });
  }

  /**
   * Unmutes a user
   * @param accessJwt - Valid access JWT token
   * @param actor - The actor's DID or handle to unmute
   * @returns Promise resolving to unmute operation result
   */
  async unmuteUser(accessJwt: string, actor: string) {
    return this.makeAuthenticatedRequest('/app.bsky.graph.unmuteActor', accessJwt, {
      method: 'POST',
      body: {
        actor,
      },
    });
  }

  /**
   * Mutes a list of actors
   * @param accessJwt - Valid access JWT token
   * @param list - The list URI to mute
   * @returns Promise resolving to mute list operation result
   */
  async muteActorList(accessJwt: string, list: string) {
    return this.makeAuthenticatedRequest('/app.bsky.graph.muteActorList', accessJwt, {
      method: 'POST',
      body: {
        list,
      },
    });
  }

  /**
   * Unmutes a previously muted actor list.
   */
  async unmuteActorList(accessJwt: string, list: string) {
    return this.makeAuthenticatedRequest('/app.bsky.graph.unmuteActorList', accessJwt, {
      method: 'POST',
      body: {
        list,
      },
    });
  }

  /**
   * Subscribes-as-block to an actor list by creating a `listblock` record on
   * the user's repo. Returns the new listblock's AT URI/CID.
   */
  async blockActorList(
    accessJwt: string,
    userDid: string,
    list: string,
  ): Promise<BlueskyCreateRecordResponse> {
    return this.makeAuthenticatedRequest<BlueskyCreateRecordResponse>('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.graph.listblock',
        record: {
          $type: 'app.bsky.graph.listblock',
          subject: list,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Unsubscribe from a list-block by deleting the listblock record.
   * `listblockUri` is the AT URI returned in the list view's
   * `viewer.blocked` field.
   */
  async unblockActorList(accessJwt: string, listblockUri: string) {
    const { repo, collection, rkey } = parseAtUri(listblockUri);
    return this.makeAuthenticatedRequest('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: { repo, collection, rkey },
    });
  }

  /** Fetch the viewer's muted accounts. */
  async getMutes(accessJwt: string, limit = 50, cursor?: string): Promise<BlueskyMutesResponse> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (cursor) params.cursor = cursor;
    return this.makeAuthenticatedRequest<BlueskyMutesResponse>('/app.bsky.graph.getMutes', accessJwt, { params });
  }

  /** Fetch the viewer's blocked accounts. */
  async getBlocks(accessJwt: string, limit = 50, cursor?: string): Promise<BlueskyBlocksResponse> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (cursor) params.cursor = cursor;
    return this.makeAuthenticatedRequest<BlueskyBlocksResponse>('/app.bsky.graph.getBlocks', accessJwt, { params });
  }

  /** Fetch accounts followed by the supplied actor. */
  async getFollows(
    accessJwt: string,
    actor: string,
    limit = 100,
    cursor?: string,
  ): Promise<BlueskyFollowsResponse> {
    const params: Record<string, string> = { actor, limit: limit.toString() };
    if (cursor) params.cursor = cursor;
    return this.makeAuthenticatedRequest<BlueskyFollowsResponse>('/app.bsky.graph.getFollows', accessJwt, { params });
  }

  /**
   * List the raw `app.bsky.graph.follow` records owned by `repo`. Unlike
   * getFollows this returns the record's `createdAt` so callers can
   * recover when the follow was written. Pages are 100 max per atproto.
   */
  async listFollowRecords(
    accessJwt: string,
    repo: string,
    limit = 100,
    cursor?: string,
  ): Promise<BlueskyFollowRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'app.bsky.graph.follow',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;
    return this.makeAuthenticatedRequest<BlueskyFollowRecordsResponse>(
      '/com.atproto.repo.listRecords',
      accessJwt,
      { params },
    );
  }

  /** Fetch the viewer's muted moderation lists. */
  async getListMutes(accessJwt: string, limit = 50, cursor?: string): Promise<BlueskyListMutesResponse> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (cursor) params.cursor = cursor;
    return this.makeAuthenticatedRequest<BlueskyListMutesResponse>('/app.bsky.graph.getListMutes', accessJwt, { params });
  }

  /** Fetch the viewer's blocked moderation lists. */
  async getListBlocks(accessJwt: string, limit = 50, cursor?: string): Promise<BlueskyListBlocksResponse> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (cursor) params.cursor = cursor;
    return this.makeAuthenticatedRequest<BlueskyListBlocksResponse>('/app.bsky.graph.getListBlocks', accessJwt, { params });
  }

  /**
   * Mutes a thread
   * @param accessJwt - Valid access JWT token
   * @param root - The root post URI of the thread to mute
   * @returns Promise resolving to mute thread operation result
   */
  async muteThread(accessJwt: string, root: string) {
    return this.makeAuthenticatedRequest('/app.bsky.graph.muteThread', accessJwt, {
      method: 'POST',
      body: {
        root,
      },
    });
  }

  /**
   * Unmutes a previously-muted thread.
   * @param accessJwt - Valid access JWT token
   * @param root - The root post URI of the thread to unmute
   */
  async unmuteThread(accessJwt: string, root: string) {
    return this.makeAuthenticatedRequest('/app.bsky.graph.unmuteThread', accessJwt, {
      method: 'POST',
      body: {
        root,
      },
    });
  }

  /**
   * Gets the lists curated by an actor.
   */
  async getLists(accessJwt: string, actor: string, limit = 50, cursor?: string): Promise<BlueskyListsResponse> {
    const params: Record<string, string> = { actor, limit: limit.toString() };
    if (cursor) params.cursor = cursor;
    return this.makeAuthenticatedRequest<BlueskyListsResponse>('/app.bsky.graph.getLists', accessJwt, { params });
  }

  /**
   * Gets a list view (metadata + members) by URI.
   */
  async getList(accessJwt: string, list: string, limit = 50, cursor?: string): Promise<BlueskyListResponse> {
    const params: Record<string, string> = { list, limit: limit.toString() };
    if (cursor) params.cursor = cursor;
    return this.makeAuthenticatedRequest<BlueskyListResponse>('/app.bsky.graph.getList', accessJwt, { params });
  }

  /**
   * Creates a curation/mute/block list.
   *
   * `purpose` is one of:
   *   - app.bsky.graph.defs#curatelist
   *   - app.bsky.graph.defs#modlist  (mute/block list)
   */
  async createList(
    accessJwt: string,
    userDid: string,
    input: { name: string; purpose: string; description?: string },
  ): Promise<BlueskyCreateRecordResponse> {
    return this.makeAuthenticatedRequest<BlueskyCreateRecordResponse>('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.graph.list',
        record: {
          $type: 'app.bsky.graph.list',
          name: input.name,
          purpose: input.purpose,
          description: input.description,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Adds an actor to a list (creates a `app.bsky.graph.listitem` record).
   * Returns the new listitem URI/CID.
   */
  async addToList(
    accessJwt: string,
    userDid: string,
    listUri: string,
    subjectDid: string,
  ): Promise<BlueskyCreateRecordResponse> {
    return this.makeAuthenticatedRequest<BlueskyCreateRecordResponse>('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.graph.listitem',
        record: {
          $type: 'app.bsky.graph.listitem',
          subject: subjectDid,
          list: listUri,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Removes a list membership by deleting its listitem record.
   */
  async removeFromList(accessJwt: string, listItemUri: string) {
    return this.makeAuthenticatedRequest('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: { uri: listItemUri },
    });
  }
}

export type { BlueskyListView, BlueskyListsResponse, BlueskyListResponse };

/**
 * Parses an AT URI of the form `at://<repo>/<collection>/<rkey>` into its
 * three components for use with com.atproto.repo.deleteRecord.
 */
function parseAtUri(uri: string): { repo: string; collection: string; rkey: string } {
  const m = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!m) throw new Error(`Invalid AT URI: ${uri}`);
  return { repo: m[1], collection: m[2], rkey: m[3] };
}
