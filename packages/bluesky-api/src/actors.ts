import { BlueskyApiClient } from './client';
import type { BlueskyPreferencesResponse, BlueskyProfileResponse, BlueskyProfileUpdateInput } from './types';

/**
 * Bluesky API actor/profile methods
 */
export class BlueskyActors extends BlueskyApiClient {
  /**
   * Gets a user's profile information
   * @param did - User's DID to fetch profile for
   * @returns Promise resolving to profile data
   */
  async getProfile(did: string): Promise<BlueskyProfileResponse> {
    return this.makeAuthenticatedRequest<BlueskyProfileResponse>('/app.bsky.actor.getProfile', {
      params: { actor: did },
    });
  }

  /**
   * Updates a user's profile information
   * @param profileData - Profile data to update
   * @returns Promise resolving to updated profile data
   */
  async updateProfile(profileData: BlueskyProfileUpdateInput): Promise<BlueskyProfileResponse> {
    return this.makeAuthenticatedRequest<BlueskyProfileResponse>('/app.bsky.actor.updateProfile', {
      method: 'POST',
      body: {
        displayName: profileData.displayName,
        description: profileData.description,
        avatar: profileData.avatar,
        banner: profileData.banner,
      },
    });
  }

  /**
   * Gets user preferences including saved feeds, content labels, etc.
   * @returns Promise resolving to user preferences
   */
  async getPreferences(): Promise<BlueskyPreferencesResponse> {
    return this.makeAuthenticatedRequest<BlueskyPreferencesResponse>('/app.bsky.actor.getPreferences');
  }
}
