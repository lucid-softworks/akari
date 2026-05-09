import { BlueskyApiClient } from './client';
import type {
  BlueskyLabelerServicesResponse,
  BlueskyPreference,
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
   * Replaces the user's preference list. Bluesky's `putPreferences` is a full
   * overwrite — pass every preference you want to keep, including ones you
   * aren't editing. Callers that only want to change one preference type
   * should read with `getPreferences`, swap the relevant entry, and put back.
   */
  async putPreferences(accessJwt: string, preferences: BlueskyPreference[]): Promise<void> {
    await this.makeAuthenticatedRequest<unknown>('/app.bsky.actor.putPreferences', accessJwt, {
      method: 'POST',
      body: { preferences },
    });
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

  /**
   * Reads the user's `app.bsky.actor.profile` record at rkey `self`.
   * Returns `null` when the record doesn't exist (new accounts that have
   * never set a display name).
   */
  async getProfileRecord(
    accessJwt: string,
    userDid: string,
  ): Promise<{ uri: string; cid: string; value: Record<string, unknown> } | null> {
    try {
      return await this.makeAuthenticatedRequest<{
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
    } catch (error) {
      const e = error as { errorCode?: string; status?: number };
      if (e.errorCode === 'RecordNotFound' || e.status === 404) return null;
      throw error;
    }
  }

  /**
   * Toggles a self-label on the user's profile record. Reads the
   * current profile so other fields (display name, avatar blob,
   * banner blob, pinnedPost, etc.) are preserved when we put the
   * record back.
   *
   * Generic so multiple self-label features can share the round-trip
   * (`!no-unauthenticated` for logged-out visibility, `automated`
   * for the bot/automation badge, etc.).
   */
  async setProfileSelfLabel(
    accessJwt: string,
    userDid: string,
    label: string,
    present: boolean,
  ) {
    const existing = await this.getProfileRecord(accessJwt, userDid);
    const record: Record<string, unknown> = { ...(existing?.value ?? {}) };

    type SelfLabelValue = { val: string };
    type SelfLabels = { $type: string; values: SelfLabelValue[] };

    const currentLabels = record.labels as SelfLabels | undefined;
    const currentValues = Array.isArray(currentLabels?.values) ? currentLabels.values : [];
    const filtered = currentValues.filter((entry) => entry?.val !== label);

    const nextValues: SelfLabelValue[] = present
      ? [...filtered, { val: label }]
      : filtered;

    if (nextValues.length === 0) {
      delete record.labels;
    } else {
      record.labels = {
        $type: 'com.atproto.label.defs#selfLabels',
        values: nextValues,
      } satisfies SelfLabels;
    }

    return this.makeAuthenticatedRequest('/com.atproto.repo.putRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.actor.profile',
        rkey: 'self',
        record,
      },
    });
  }

  /**
   * Toggles the `!no-unauthenticated` self-label. atproto's labelers and
   * AppView both honour this label by suppressing the profile from
   * logged-out viewers.
   */
  async setLoggedOutVisibilityDiscouraged(
    accessJwt: string,
    userDid: string,
    discouraged: boolean,
  ) {
    return this.setProfileSelfLabel(accessJwt, userDid, '!no-unauthenticated', discouraged);
  }

  /**
   * Toggles the `automated` self-label, marking the account as a bot
   * or other automated poster. Other clients can show or hide
   * accordingly.
   */
  async setAccountAutomated(accessJwt: string, userDid: string, automated: boolean) {
    return this.setProfileSelfLabel(accessJwt, userDid, 'automated', automated);
  }
}
