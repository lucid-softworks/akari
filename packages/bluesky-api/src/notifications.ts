import { BlueskyApiClient } from './client';
import type { BlueskyApiClientOptions } from './client';
import type { BlueskyNotificationsResponse, BlueskyUnreadNotificationCount } from './types';

/**
 * Bluesky notifications API client
 */
export class BlueskyNotifications extends BlueskyApiClient {
  constructor(pdsUrl: string = 'https://bsky.social', options: BlueskyApiClientOptions = {}) {
    const baseUrl = pdsUrl.endsWith('/xrpc') ? pdsUrl.slice(0, -5) : pdsUrl;
    super(baseUrl, options);
  }

  /**
   * List notifications for the authenticated user
   * @param limit - Number of notifications to fetch (1-100, default: 50)
   * @param cursor - Pagination cursor
   * @param reasons - Notification reasons to include
   * @param priority - Whether to include priority notifications
   * @param seenAt - Timestamp for seen notifications
   */
  async listNotifications(
    limit: number = 50,
    cursor?: string,
    reasons?: string[],
    priority?: boolean,
    seenAt?: string,
  ): Promise<BlueskyNotificationsResponse> {
    const params: Record<string, string | string[]> = {};

    if (limit) {
      params.limit = limit.toString();
    }

    if (cursor) {
      params.cursor = cursor;
    }

    if (priority !== undefined) {
      params.priority = String(priority);
    }

    if (seenAt) {
      params.seenAt = seenAt;
    }

    if (reasons && reasons.length > 0) {
      params.reasons = reasons;
    }

    return this.makeAuthenticatedRequest<BlueskyNotificationsResponse>(
      '/app.bsky.notification.listNotifications',
      { params },
    );
  }

  /**
   * Retrieves the unread notification counter maintained by Bluesky.
   * @returns Object containing the unread notification total.
   */
  async getUnreadCount(): Promise<BlueskyUnreadNotificationCount> {
    return this.makeAuthenticatedRequest<BlueskyUnreadNotificationCount>(
      '/app.bsky.notification.getUnreadCount',
    );
  }
}
