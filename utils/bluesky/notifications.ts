import type { BlueskyNotificationsResponse } from './types';

/**
 * Bluesky notifications API client
 */
export class BlueskyNotifications {
  private pdsUrl: string;

  constructor(pdsUrl: string = 'https://bsky.social') {
    this.pdsUrl = pdsUrl;
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

    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);
    if (priority !== undefined) params.append('priority', priority.toString());
    if (seenAt) params.append('seenAt', seenAt);
    if (reasons && reasons.length > 0) {
      reasons.forEach((reason) => params.append('reasons', reason));
    }

    const response = await fetch(`${url}?${params.toString()}`, {
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
   * Get the count of unread notifications
   * @param accessJwt - JWT access token
   * @returns Promise resolving to unread count
   */
  async getUnreadCount(accessJwt: string): Promise<{ count: number }> {
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
