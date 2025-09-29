import { BlueskyApiClient } from './client';
import type {
  BlueskyConvosResponse,
  BlueskyMessagesResponse,
  BlueskySendMessageInput,
  BlueskySendMessageResponse,
} from './types';

/**
 * Bluesky API conversation methods
 */
export class BlueskyConversations extends BlueskyApiClient {
  /**
   * Gets a list of conversations
   * @param limit - Number of conversations to fetch (1-100, default: 50)
   * @param cursor - Pagination cursor
   * @param readState - Filter by read state ("unread")
   * @param status - Filter by status ("request" or "accepted")
   * @returns Promise resolving to conversations data
   */
  async listConversations(
    limit: number = 50,
    cursor?: string,
    readState?: 'unread',
    status?: 'request' | 'accepted',
  ): Promise<BlueskyConvosResponse> {
    const params: Record<string, string> = { limit: limit.toString() };

    if (cursor) params.cursor = cursor;
    if (readState) params.readState = readState;
    if (status) params.status = status;

    return this.makeAuthenticatedRequest<BlueskyConvosResponse>('/chat.bsky.convo.listConvos', {
      params,
      headers: {
        'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
      },
    });
  }

  /**
   * Gets messages for a specific conversation
   * @param convoId - The conversation ID
   * @param limit - Number of messages to fetch (1-100, default: 50)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to messages data
   */
  async getMessages(
    convoId: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyMessagesResponse> {
    const params: Record<string, string> = { convoId, limit: limit.toString() };
    if (cursor) params.cursor = cursor;

    return this.makeAuthenticatedRequest<BlueskyMessagesResponse>('/chat.bsky.convo.getMessages', {
      params,
      headers: {
        'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
      },
    });
  }

  /**
   * Sends a message to a conversation
   * @param convoId - The conversation ID
   * @param message - The message to send
   * @returns Promise resolving to the sent message data
   */
  async sendMessage(
    convoId: string,
    message: BlueskySendMessageInput,
  ): Promise<BlueskySendMessageResponse> {
    return this.makeAuthenticatedRequest<BlueskySendMessageResponse>('/chat.bsky.convo.sendMessage', {
      method: 'POST',
      headers: {
        'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
      },
      body: {
        convoId,
        message,
      },
    });
  }
}
