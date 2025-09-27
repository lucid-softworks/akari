import { BlueskyApiClient, type BlueskyApiClientOptions } from './client';
import type { BlueskyNotificationsResponse, BlueskyUnreadNotificationCount } from './types';

/**
 * Bluesky notifications API client
 */
export class BlueskyNotifications extends BlueskyApiClient {
  constructor(pdsUrl: string = 'https://bsky.social', options: BlueskyApiClientOptions = {}) {
    super(pdsUrl, options);
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
    const params: Record<string, string | string[]> = {
      limit: limit.toString(),
    };

    if (cursor) params.cursor = cursor;
    if (priority !== undefined) params.priority = priority.toString();
    if (seenAt) params.seenAt = seenAt;
    if (reasons && reasons.length > 0) {
      params.reasons = reasons;
    }

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
}
