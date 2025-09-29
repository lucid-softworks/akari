import { BlueskyApiClient } from './client';
import type { BlueskySession } from './types';

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
      '/com.atproto.server.createSession',
      {
        method: 'POST',
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
      '/com.atproto.server.refreshSession',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${refreshJwt}`,
        },
      }
    );
  }
}
