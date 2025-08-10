import { BlueskyApiClient } from './client';
import type { BlueskyConvosResponse, BlueskyMessagesResponse } from './types';

/**
 * Bluesky API conversation methods
 */
export class BlueskyConversations extends BlueskyApiClient {
  /**
   * Gets a list of conversations
   * @param accessJwt - Valid access JWT token
   * @param limit - Number of conversations to fetch (1-100, default: 50)
   * @param cursor - Pagination cursor
   * @param readState - Filter by read state ("unread")
   * @param status - Filter by status ("request" or "accepted")
   * @returns Promise resolving to conversations data
   */
  async listConversations(
    accessJwt: string,
    limit: number = 50,
    cursor?: string,
    readState?: 'unread',
    status?: 'request' | 'accepted',
  ): Promise<BlueskyConvosResponse> {
    const params: Record<string, string> = { limit: limit.toString() };

    if (cursor) params.cursor = cursor;
    if (readState) params.readState = readState;
    if (status) params.status = status;

    return this.makeAuthenticatedRequest<BlueskyConvosResponse>('/chat.bsky.convo.listConvos', accessJwt, {
      params,
      headers: {
        'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
      },
    });
  }

  /**
   * Gets messages for a specific conversation
   * @param accessJwt - Valid access JWT token
   * @param convoId - The conversation ID
   * @param limit - Number of messages to fetch (1-100, default: 50)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to messages data
   */
  async getMessages(
    accessJwt: string,
    convoId: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyMessagesResponse> {
    const params: Record<string, string> = { convoId, limit: limit.toString() };
    if (cursor) params.cursor = cursor;

    return this.makeAuthenticatedRequest<BlueskyMessagesResponse>('/chat.bsky.convo.getMessages', accessJwt, {
      params,
      headers: {
        'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
      },
    });
  }
}
