import { BlueskyApiClient } from './client';
import { buildAcceptLabelersHeader } from './labelers';
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
  async getProfile(
    accessJwt: string,
    did: string,
    acceptLabelers?: readonly string[],
  ): Promise<BlueskyProfileResponse> {
    return this.makeAuthenticatedRequest<BlueskyProfileResponse>('/app.bsky.actor.getProfile', accessJwt, {
      params: { actor: did },
      headers: buildAcceptLabelersHeader(acceptLabelers),
    });
  }

  /**
   * Batch profile lookup. atproto's `app.bsky.actor.getProfiles` accepts
   * up to 25 actors per call and returns the detailed view (with the
   * follower / following / posts counts that the lightweight `profileView`
   * variants don't carry).
   */
  async getProfiles(
    accessJwt: string,
    actors: string[],
    acceptLabelers?: readonly string[],
  ): Promise<{ profiles: BlueskyProfileResponse[] }> {
    return this.makeAuthenticatedRequest<{ profiles: BlueskyProfileResponse[] }>(
      '/app.bsky.actor.getProfiles',
      accessJwt,
      { params: { actors }, headers: buildAcceptLabelersHeader(acceptLabelers) },
    );
  }

  /**
   * Personalised follow suggestions for the authenticated viewer. The
   * AppView returns actors in roughly the same lightweight `profileView`
   * shape as search results — display name, avatar, bio snippet, and
   * (when present) the viewer's follow relationship.
   */
  async getSuggestions(
    accessJwt: string,
    options: { limit?: number; cursor?: string; acceptLabelers?: readonly string[] } = {},
  ): Promise<{ actors: BlueskyProfileResponse[]; cursor?: string }> {
    const { limit = 10, cursor, acceptLabelers } = options;
    return this.makeAuthenticatedRequest<{ actors: BlueskyProfileResponse[]; cursor?: string }>(
      '/app.bsky.actor.getSuggestions',
      accessJwt,
      {
        params: { limit: String(limit), ...(cursor ? { cursor } : {}) },
        headers: buildAcceptLabelersHeader(acceptLabelers),
      },
    );
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
    const record: Record<string, unknown> = { ...existing?.value };

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

  /**
   * Publishes (or updates) the user's live status by writing the
   * `app.bsky.actor.status` record at rkey `self`. atproto models this as a
   * single-record collection, so going live and editing an existing live
   * status are the same `putRecord`.
   *
   * Uses `swapRecord` for optimistic concurrency: we read the current
   * record's CID and pass it as the swap target. A concurrent write (the
   * status auto-published from another client, say) makes the PDS reject
   * with `InvalidSwap`; we re-read and retry a few times before giving up.
   *
   * The optional external embed is the live link card. The AppView only
   * surfaces the badge when the link's host is in the live-now allowlist, so
   * callers should validate the host before calling.
   */
  async setActorStatus(
    accessJwt: string,
    userDid: string,
    input: {
      /** Status duration in minutes (lexicon minimum is 1). */
      durationMinutes: number;
      /** External link card for the live content. */
      external?: { uri: string; title: string; description: string };
      /** Override the record's createdAt (used when editing to keep the original). */
      createdAt?: string;
    },
  ): Promise<void> {
    const collection = 'app.bsky.actor.status';
    const record: Record<string, unknown> = {
      $type: collection,
      status: 'app.bsky.actor.status#live',
      durationMinutes: input.durationMinutes,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    if (input.external) {
      record.embed = {
        $type: 'app.bsky.embed.external',
        external: { $type: 'app.bsky.embed.external#external', ...input.external },
      };
    }

    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const existing = await this.getStatusRecord(accessJwt, userDid);
      try {
        await this.makeAuthenticatedRequest('/com.atproto.repo.putRecord', accessJwt, {
          method: 'POST',
          body: {
            repo: userDid,
            collection,
            rkey: 'self',
            record,
            swapRecord: existing?.cid ?? null,
          },
        });
        return;
      } catch (error) {
        const e = error as { errorCode?: string };
        if (e.errorCode === 'InvalidSwap' && attempt < maxAttempts - 1) continue;
        throw error;
      }
    }
  }

  /**
   * Ends the user's live broadcast by deleting the `app.bsky.actor.status`
   * record. A missing record (already cleared / never set) is treated as
   * success.
   */
  async clearActorStatus(accessJwt: string, userDid: string): Promise<void> {
    try {
      await this.makeAuthenticatedRequest('/com.atproto.repo.deleteRecord', accessJwt, {
        method: 'POST',
        body: {
          repo: userDid,
          collection: 'app.bsky.actor.status',
          rkey: 'self',
        },
      });
    } catch (error) {
      const e = error as { errorCode?: string; status?: number };
      if (e.errorCode === 'RecordNotFound' || e.status === 404) return;
      throw error;
    }
  }

  /**
   * Reads the user's `app.bsky.actor.status` record at rkey `self`.
   * Returns `null` when no status record exists.
   */
  private async getStatusRecord(
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
          collection: 'app.bsky.actor.status',
          rkey: 'self',
        },
      });
    } catch (error) {
      const e = error as { errorCode?: string; status?: number };
      if (e.errorCode === 'RecordNotFound' || e.status === 404) return null;
      throw error;
    }
  }
}
