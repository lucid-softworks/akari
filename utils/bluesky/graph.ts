import { BlueskyApiClient } from "./client";

/**
 * Bluesky API graph methods (follows, blocks, etc.)
 */
export class BlueskyGraph extends BlueskyApiClient {
  /**
   * Follows a user
   * @param accessJwt - Valid access JWT token
   * @param did - The DID of the user to follow
   * @returns Promise resolving to follow operation result
   */
  async followUser(accessJwt: string, did: string) {
    return this.makeAuthenticatedRequest(
      "/com.atproto.repo.createRecord",
      accessJwt,
      {
        method: "POST",
        body: {
          repo: "self",
          collection: "app.bsky.graph.follow",
          record: {
            subject: did,
            createdAt: new Date().toISOString(),
          },
        },
      }
    );
  }

  /**
   * Unfollows a user
   * @param accessJwt - Valid access JWT token
   * @param followUri - The URI of the follow record to delete
   * @returns Promise resolving to unfollow operation result
   */
  async unfollowUser(accessJwt: string, followUri: string) {
    return this.makeAuthenticatedRequest(
      "/com.atproto.repo.deleteRecord",
      accessJwt,
      {
        method: "POST",
        body: {
          uri: followUri,
        },
      }
    );
  }

  /**
   * Blocks a user
   * @param accessJwt - Valid access JWT token
   * @param did - The DID of the user to block
   * @returns Promise resolving to block operation result
   */
  async blockUser(accessJwt: string, did: string) {
    return this.makeAuthenticatedRequest(
      "/com.atproto.repo.createRecord",
      accessJwt,
      {
        method: "POST",
        body: {
          repo: "self",
          collection: "app.bsky.graph.block",
          record: {
            subject: did,
            createdAt: new Date().toISOString(),
          },
        },
      }
    );
  }

  /**
   * Unblocks a user
   * @param accessJwt - Valid access JWT token
   * @param blockUri - The URI of the block record to delete
   * @returns Promise resolving to unblock operation result
   */
  async unblockUser(accessJwt: string, blockUri: string) {
    return this.makeAuthenticatedRequest(
      "/com.atproto.repo.deleteRecord",
      accessJwt,
      {
        method: "POST",
        body: {
          uri: blockUri,
        },
      }
    );
  }
}
