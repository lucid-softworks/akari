import { BlueskyApiClient } from "./client";
import type { BlueskySession } from "./types";

/**
 * Bluesky API authentication methods
 */
export class BlueskyAuth extends BlueskyApiClient {
  /**
   * Creates a new session with the Bluesky API
   * @param identifier - User's handle or email
   * @param password - App password
   * @returns Promise resolving to session data
   */
  async createSession(
    identifier: string,
    password: string
  ): Promise<BlueskySession> {
    return this.makeRequest<BlueskySession>(
      "/com.atproto.server.createSession",
      {
        method: "POST",
        body: {
          identifier,
          password,
        },
      }
    );
  }

  /**
   * Refreshes an existing session using the refresh token
   * @param refreshJwt - The refresh JWT token
   * @returns Promise resolving to new session data
   */
  async refreshSession(refreshJwt: string): Promise<BlueskySession> {
    return this.makeRequest<BlueskySession>(
      "/com.atproto.server.refreshSession",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshJwt}`,
        },
      }
    );
  }

  /**
   * Mints a short-lived service auth JWT scoped to a single audience
   * (e.g. the video transcode service) and a single lexicon method.
   * Required to talk to services hosted off the user's PDS.
   */
  async getServiceAuth(
    accessJwt: string,
    aud: string,
    lxm: string,
    expSeconds: number = 60 * 5,
  ): Promise<{ token: string }> {
    const exp = Math.floor(Date.now() / 1000) + expSeconds;
    return this.makeAuthenticatedRequest<{ token: string }>(
      "/com.atproto.server.getServiceAuth",
      accessJwt,
      {
        params: { aud, lxm, exp: String(exp) },
      },
    );
  }
}
