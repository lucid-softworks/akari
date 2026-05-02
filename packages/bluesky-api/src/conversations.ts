import { BlueskyApiClient } from './client';
import type {
  BlueskyConvoView,
  BlueskyConvosResponse,
  BlueskyMessagesResponse,
  BlueskySendMessageInput,
  BlueskySendMessageResponse,
} from './types';

const CHAT_PROXY = 'did:web:api.bsky.chat#bsky_chat';

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

  /**
   * Sends a message to a conversation
   * @param accessJwt - Valid access JWT token
   * @param convoId - The conversation ID
   * @param message - The message to send
   * @returns Promise resolving to the sent message data
   */
  /**
   * Marks a conversation as read up to the current time.
   */
  async updateRead(accessJwt: string, convoId: string): Promise<void> {
    await this.makeAuthenticatedRequest('/chat.bsky.convo.updateRead', accessJwt, {
      method: 'POST',
      headers: {
        'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
      },
      body: { convoId },
    });
  }

  async sendMessage(
    accessJwt: string,
    convoId: string,
    message: BlueskySendMessageInput,
  ): Promise<BlueskySendMessageResponse> {
    return this.makeAuthenticatedRequest<BlueskySendMessageResponse>('/chat.bsky.convo.sendMessage', accessJwt, {
      method: 'POST',
      headers: {
        'atproto-proxy': CHAT_PROXY,
      },
      body: {
        convoId,
        message,
      },
    });
  }

  /**
   * Looks up the conversation for an exact set of member DIDs, creating
   * one if it doesn't exist. Returns the convo view (including `id`).
   *
   * For 1:1 chats, pass the peer's DID. For a group chat, pass every
   * member's DID — the current user is implicit and shouldn't be included.
   */
  async getConvoForMembers(
    accessJwt: string,
    members: string[],
  ): Promise<{ convo: BlueskyConvoView }> {
    return this.makeAuthenticatedRequest<{ convo: BlueskyConvoView }>(
      '/chat.bsky.convo.getConvoForMembers',
      accessJwt,
      {
        params: { members },
        headers: { 'atproto-proxy': CHAT_PROXY },
      },
    );
  }

  /**
   * Fetches a single convo by id.
   */
  async getConvo(accessJwt: string, convoId: string): Promise<{ convo: BlueskyConvoView }> {
    return this.makeAuthenticatedRequest<{ convo: BlueskyConvoView }>('/chat.bsky.convo.getConvo', accessJwt, {
      params: { convoId },
      headers: { 'atproto-proxy': CHAT_PROXY },
    });
  }

  /**
   * Leaves a conversation. Returns the convo id and last seen rev.
   */
  async leaveConvo(accessJwt: string, convoId: string) {
    return this.makeAuthenticatedRequest('/chat.bsky.convo.leaveConvo', accessJwt, {
      method: 'POST',
      headers: { 'atproto-proxy': CHAT_PROXY },
      body: { convoId },
    });
  }

  /**
   * Adds members to an existing group conversation.
   */
  async addMembers(accessJwt: string, convoId: string, dids: string[]) {
    return this.makeAuthenticatedRequest<{ convo: BlueskyConvoView }>('/chat.bsky.convo.addMembers', accessJwt, {
      method: 'POST',
      headers: { 'atproto-proxy': CHAT_PROXY },
      body: { convoId, dids },
    });
  }

  /**
   * Removes members from an existing group conversation.
   */
  async removeMembers(accessJwt: string, convoId: string, dids: string[]) {
    return this.makeAuthenticatedRequest<{ convo: BlueskyConvoView }>('/chat.bsky.convo.removeMembers', accessJwt, {
      method: 'POST',
      headers: { 'atproto-proxy': CHAT_PROXY },
      body: { convoId, dids },
    });
  }

  /**
   * Renames a group conversation.
   */
  async updateConvoName(accessJwt: string, convoId: string, name: string) {
    return this.makeAuthenticatedRequest<{ convo: BlueskyConvoView }>('/chat.bsky.convo.updateConvoName', accessJwt, {
      method: 'POST',
      headers: { 'atproto-proxy': CHAT_PROXY },
      body: { convoId, name },
    });
  }
}
