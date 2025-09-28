import { BlueskyApiClient } from './client';
import type {
  BlueskyCreateRecordResponse,
  BlueskyListItemsResponse,
  BlueskyListsResponse,
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
   * Adds an actor to one of the viewer's lists.
   * @param accessJwt - Valid access JWT token.
   * @param list - The list URI that should receive the member.
   * @param subject - DID of the actor that should be added to the list.
   * @returns Record metadata returned by the createRecord mutation.
   */
  async createListItem(accessJwt: string, list: string, subject: string): Promise<BlueskyCreateRecordResponse> {
    return this.makeAuthenticatedRequest('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: 'self',
        collection: 'app.bsky.graph.listitem',
        record: {
          list,
          subject,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Removes an actor from one of the viewer's lists.
   * @param accessJwt - Valid access JWT token.
   * @param listItemUri - URI of the list item record to delete.
   * @returns Response payload from the deleteRecord mutation.
   */
  async deleteListItem(accessJwt: string, listItemUri: string) {
    return this.makeAuthenticatedRequest('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: {
        uri: listItemUri,
      },
    });
  }

  /**
   * Retrieves lists owned by the specified actor.
   * @param accessJwt - Valid access JWT token.
   * @param actor - DID or handle of the actor whose lists should be returned.
   * @param limit - Maximum number of lists to return.
   * @param cursor - Pagination cursor from a previous request.
   * @returns Collection of list views.
   */
  async getLists(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyListsResponse> {
    return this.makeAuthenticatedRequest('/app.bsky.graph.getLists', accessJwt, {
      params: {
        actor,
        limit: limit.toString(),
        ...(cursor ? { cursor } : {}),
      },
    });
  }

  /**
   * Lists list item records stored in a repository.
   * @param accessJwt - Valid access JWT token.
   * @param repo - DID or handle of the repository to inspect.
   * @param limit - Maximum number of records to return per page.
   * @param cursor - Pagination cursor from a previous request.
   * @returns List item records created by the repository owner.
   */
  async listListItems(
    accessJwt: string,
    repo: string,
    limit: number = 100,
    cursor?: string,
  ): Promise<BlueskyListItemsResponse> {
    return this.makeAuthenticatedRequest('/com.atproto.repo.listRecords', accessJwt, {
      params: {
        repo,
        collection: 'app.bsky.graph.listitem',
        limit: limit.toString(),
        ...(cursor ? { cursor } : {}),
      },
    });
  }
}
