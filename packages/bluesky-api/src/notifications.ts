import type { BlueskyNotificationsResponse, BlueskyUnreadNotificationCount } from './types';

/**
 * Bluesky notifications API client
 */
export class BlueskyNotifications {
  private pdsUrl: string;

  constructor(pdsUrl: string = 'https://bsky.social') {
    // Ensure the PDS URL doesn't end with /xrpc (it will be added in API calls)
    this.pdsUrl = pdsUrl.endsWith('/xrpc') ? pdsUrl.slice(0, -5) : pdsUrl;
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
    const url = `${this.pdsUrl}/xrpc/app.bsky.notification.listNotifications`;

    const parameters = new URLSearchParams();
    if (limit) parameters.append('limit', limit.toString());
    if (cursor) parameters.append('cursor', cursor);
    if (priority !== undefined) parameters.append('priority', priority.toString());
    if (seenAt) parameters.append('seenAt', seenAt);
    if (reasons && reasons.length > 0) {
      for (const reason of reasons) {
        parameters.append('reasons', reason);
      }
    }

    const response = await fetch(`${url}?${parameters.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Retrieves the unread notification counter maintained by Bluesky.
   * @param accessJwt - JWT access token authorised to read notifications.
   * @returns Object containing the unread notification total.
   */
  async getUnreadCount(accessJwt: string): Promise<BlueskyUnreadNotificationCount> {
    const url = `${this.pdsUrl}/xrpc/app.bsky.notification.getUnreadCount`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
