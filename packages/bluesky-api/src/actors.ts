import { BlueskyApiClient } from './client';
import type {
  BlueskyLabelerServicesResponse,
  BlueskyPreferencesResponse,
  BlueskyProfileResponse,
  BlueskyProfileUpdateInput,
} from './types';

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
  async getProfile(accessJwt: string, did: string): Promise<BlueskyProfileResponse> {
    return this.makeAuthenticatedRequest<BlueskyProfileResponse>('/app.bsky.actor.getProfile', accessJwt, {
      params: { actor: did },
    });
  }

  /**
   * Updates a user's profile information
   * @param accessJwt - Valid access JWT token
   * @param profileData - Profile data to update
   * @returns Promise resolving to updated profile data
   */
  async updateProfile(
    accessJwt: string,
    profileData: BlueskyProfileUpdateInput,
  ): Promise<BlueskyProfileResponse> {
    return this.makeAuthenticatedRequest<BlueskyProfileResponse>('/app.bsky.actor.updateProfile', accessJwt, {
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
   * @param accessJwt - Valid access JWT token
   * @returns Promise resolving to user preferences
   */
  async getPreferences(accessJwt: string): Promise<BlueskyPreferencesResponse> {
    return this.makeAuthenticatedRequest<BlueskyPreferencesResponse>('/app.bsky.actor.getPreferences', accessJwt);
  }

  /**
   * Resolve labeler service DIDs to detailed views (creator, policies).
   */
  async getLabelerServices(
    accessJwt: string,
    dids: string[],
    detailed = true,
  ): Promise<BlueskyLabelerServicesResponse> {
    return this.makeAuthenticatedRequest<BlueskyLabelerServicesResponse>('/app.bsky.labeler.getServices', accessJwt, {
      params: {
        dids,
        detailed: detailed ? 'true' : 'false',
      },
    });
  }

  /**
   * Sets (or clears) the user's pinned post by editing the
   * `app.bsky.actor.profile` record at rkey `self`.
   *
   * Pass `null` for `pinned` to unpin. Reads the current profile record
   * first so we can preserve other fields (display name, description,
   * avatar/banner blob refs, joinedViaStarterPack, etc.) and use
   * `swapRecord` for optimistic concurrency.
   */
  async setPinnedPost(
    accessJwt: string,
    userDid: string,
    pinned: { uri: string; cid: string } | null,
  ) {
    // Fetch the current profile record (rkey "self"). The record may not
    // exist yet if the account never set a display name, so handle 404.
    let existingRecord: Record<string, unknown> = {};
    try {
      const current = await this.makeAuthenticatedRequest<{
        uri: string;
        cid: string;
        value: Record<string, unknown>;
      }>('/com.atproto.repo.getRecord', accessJwt, {
        params: {
          repo: userDid,
          collection: 'app.bsky.actor.profile',
          rkey: 'self',
        },
      });
      existingRecord = current.value ?? {};
    } catch {
      // No profile record yet — that's fine, we'll create one below.
    }

    const nextRecord: Record<string, unknown> = { ...existingRecord };
    if (pinned) {
      nextRecord.pinnedPost = { uri: pinned.uri, cid: pinned.cid };
    } else {
      delete nextRecord.pinnedPost;
    }

    return this.makeAuthenticatedRequest('/com.atproto.repo.putRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.actor.profile',
        rkey: 'self',
        record: nextRecord,
      },
    });
  }
}
