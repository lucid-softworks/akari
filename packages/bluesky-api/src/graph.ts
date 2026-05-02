import { BlueskyApiClient } from './client';
import type {
  BlueskyListView,
  BlueskyListsResponse,
  BlueskyListResponse,
  BlueskyCreateRecordResponse,
} from './types';

/**
 * Bluesky API graph methods (follows, blocks, mutes, etc.)
 */
export class BlueskyGraph extends BlueskyApiClient {
  /**
   * Follows a user
   * @param accessJwt - Valid access JWT token
   * @param did - The DID of the user to follow
   * @returns Promise resolving to follow operation result
   */
  async followUser(accessJwt: string, did: string) {
    return this.makeAuthenticatedRequest('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: 'self',
        collection: 'app.bsky.graph.follow',
        record: {
          subject: did,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Unfollows a user
   * @param accessJwt - Valid access JWT token
   * @param followUri - The URI of the follow record to delete
   * @returns Promise resolving to unfollow operation result
   */
  async unfollowUser(accessJwt: string, followUri: string) {
    return this.makeAuthenticatedRequest('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: {
        uri: followUri,
      },
    });
  }

  /**
   * Blocks a user
   * @param accessJwt - Valid access JWT token
   * @param did - The DID of the user to block
   * @returns Promise resolving to block operation result
   */
  async blockUser(accessJwt: string, did: string) {
    return this.makeAuthenticatedRequest('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: 'self',
        collection: 'app.bsky.graph.block',
        record: {
          subject: did,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Unblocks a user
   * @param accessJwt - Valid access JWT token
   * @param blockUri - The URI of the block record to delete
   * @returns Promise resolving to unblock operation result
   */
  async unblockUser(accessJwt: string, blockUri: string) {
    return this.makeAuthenticatedRequest('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: {
        uri: blockUri,
      },
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
