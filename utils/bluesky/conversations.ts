import { BlueskyApiClient } from "./client";
import type { BlueskyConvosResponse, BlueskyMessagesResponse } from "./types";

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
    readState?: "unread",
    status?: "request" | "accepted"
  ): Promise<BlueskyConvosResponse> {
    const params: any = { limit };

    if (cursor) params.cursor = cursor;
    if (readState) params.readState = readState;
    if (status) params.status = status;

    console.log(
      "Making conversations API request to:",
      `https://api.bsky.chat/xrpc/chat.bsky.convo.listConvos`
    );
    console.log("With params:", params);

    try {
      // Use the dedicated chat service URL
      const chatBaseUrl = "https://api.bsky.chat/xrpc";
      let url = `${chatBaseUrl}/chat.bsky.convo.listConvos`;

      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
        url += `?${searchParams.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessJwt}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Conversations API success:", data);
      return data;
    } catch (error) {
      console.error("Conversations API error in client:", error);
      throw error;
    }
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
    cursor?: string
  ): Promise<BlueskyMessagesResponse> {
    const params: any = { convoId, limit };

    if (cursor) params.cursor = cursor;

    console.log(
      "Making messages API request to:",
      `https://api.bsky.chat/xrpc/chat.bsky.convo.getMessages`
    );
    console.log("With params:", params);

    try {
      // Use the dedicated chat service URL
      const chatBaseUrl = "https://api.bsky.chat/xrpc";
      let url = `${chatBaseUrl}/chat.bsky.convo.getMessages`;

      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
        url += `?${searchParams.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessJwt}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Messages API success:", data);
      return data;
    } catch (error) {
      console.error("Messages API error in client:", error);
      throw error;
    }
  }
}
