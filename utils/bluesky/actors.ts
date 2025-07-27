import { BlueskyApiClient } from "./client";
import type { BlueskyProfileResponse } from "./types";

/**
 * Bluesky API actor/profile methods
 */
export class BlueskyActors extends BlueskyApiClient {
  /**
   * Gets a user's profile information
   * @param accessJwt - Valid access JWT token
   * @param did - User's DID to fetch profile for
   * @returns Promise resolving to profile data
   */
  async getProfile(
    accessJwt: string,
    did: string
  ): Promise<BlueskyProfileResponse> {
    return this.makeAuthenticatedRequest<BlueskyProfileResponse>(
      "/app.bsky.actor.getProfile",
      accessJwt,
      {
        params: { actor: did },
      }
    );
  }
}
