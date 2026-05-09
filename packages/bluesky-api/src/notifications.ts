import { BlueskyApiClient } from './client';
import type {
  BlueskyNotificationPreferences,
  BlueskyNotificationsResponse,
  BlueskyUnreadNotificationCount,
} from './types';

/**
 * Bluesky notifications API client
 */
export class BlueskyNotifications extends BlueskyApiClient {
  constructor(pdsUrl: string = 'https://bsky.social', appViewProxyDid?: string | null) {
    // Strip a trailing /xrpc — `makeRequest` re-appends `/xrpc${endpoint}`,
    // so a baseUrl ending in `/xrpc` would double up.
    super(pdsUrl.endsWith('/xrpc') ? pdsUrl.slice(0, -5) : pdsUrl, appViewProxyDid);
  }

  /**
   * List notifications for the authenticated user
   * @param accessJwt - JWT access token
   * @param limit - Number of notifications to fetch (1-100, default: 50)
   * @param cursor - Pagination cursor
   * @param reasons - Notification reasons to include
   * @param priority - Whether to include priority notifications
   * @param seenAt - Timestamp for seen notifications
   */
  async listNotifications(
    accessJwt: string,
    limit: number = 50,
    cursor?: string,
    reasons?: string[],
    priority?: boolean,
    seenAt?: string,
  ): Promise<BlueskyNotificationsResponse> {
    const params: Record<string, string | string[]> = {};
    if (limit) params.limit = limit.toString();
    if (cursor) params.cursor = cursor;
    if (priority !== undefined) params.priority = priority.toString();
    if (seenAt) params.seenAt = seenAt;
    if (reasons && reasons.length > 0) params.reasons = reasons;

    return this.makeAuthenticatedRequest<BlueskyNotificationsResponse>(
      '/app.bsky.notification.listNotifications',
      accessJwt,
      { params },
    );
  }

  /**
   * Retrieves the unread notification counter maintained by Bluesky.
   * @param accessJwt - JWT access token authorised to read notifications.
   * @returns Object containing the unread notification total.
   */
  async getUnreadCount(accessJwt: string): Promise<BlueskyUnreadNotificationCount> {
    return this.makeAuthenticatedRequest<BlueskyUnreadNotificationCount>(
      '/app.bsky.notification.getUnreadCount',
      accessJwt,
    );
  }

  /**
   * Marks notifications as seen up to the current time.
   */
  async updateSeen(accessJwt: string): Promise<void> {
    await this.makeAuthenticatedRequest<void>(
      '/app.bsky.notification.updateSeen',
      accessJwt,
      {
        method: 'POST',
        body: { seenAt: new Date().toISOString() },
      },
    );
  }

  /**
   * Reads the user's per-category notification preferences. Returns the
   * full preferences object (chat, follow, like, mention, etc.). New
   * accounts return defaults — unset categories should be treated as
   * "all + push enabled" client-side, matching atproto's behaviour.
   */
  async getNotificationPreferences(accessJwt: string): Promise<BlueskyNotificationPreferences> {
    const res = await this.makeAuthenticatedRequest<{
      preferences?: BlueskyNotificationPreferences;
    } & BlueskyNotificationPreferences>(
      '/app.bsky.notification.getPreferences',
      accessJwt,
    );
    // atproto wraps the prefs in a `preferences` field. Fall back to the
    // raw response if the gateway returns an unwrapped shape.
    return res.preferences ?? res;
  }

  /**
   * Writes the user's per-category notification preferences via the v2
   * endpoint. Pass only the categories you intend to update — the server
   * merges with existing values rather than overwriting unset slots.
   */
  async putNotificationPreferencesV2(
    accessJwt: string,
    prefs: BlueskyNotificationPreferences,
  ): Promise<void> {
    await this.makeAuthenticatedRequest<void>(
      '/app.bsky.notification.putPreferencesV2',
      accessJwt,
      {
        method: 'POST',
        body: prefs as unknown as Record<string, unknown>,
      },
    );
  }
}
