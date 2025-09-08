import { BlueskyApiClient } from './client';

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
}
