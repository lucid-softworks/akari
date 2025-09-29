import { BlueskyConversations } from './conversations';
import type {
  BlueskyConvosResponse,
  BlueskyMessagesResponse,
  BlueskySendMessageInput,
  BlueskySendMessageResponse,
  BlueskySession,
} from './types';

describe('BlueskyConversations', () => {
  const createSession = (overrides: Partial<BlueskySession> = {}): BlueskySession =>
    ({
      handle: 'user.test',
      did: 'did:plc:123',
      active: true,
      accessJwt: 'jwt',
      refreshJwt: 'refresh',
      ...overrides,
    } as BlueskySession);

  class TestConversations extends BlueskyConversations {
    public lastCall?: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      };
    };

    public response: unknown;

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      const session = this.requireSession();
      this.lastCall = { endpoint, accessJwt: session.accessJwt, options };
      return this.response as T;
    }
  }

  it('lists conversations with optional filters', async () => {
    const convoResponse: BlueskyConvosResponse = {
      cursor: 'next',
      convos: [],
    };
    const conversations = new TestConversations();
    conversations.response = convoResponse;

    const session = createSession();
    conversations.useSession(session);
    const result = await conversations.listConversations(10, 'cursor-1', 'unread', 'accepted');

    expect(result).toEqual(convoResponse);
    expect(conversations.lastCall).toEqual({
      endpoint: '/chat.bsky.convo.listConvos',
      accessJwt: session.accessJwt,
      options: {
        params: {
          limit: '10',
          cursor: 'cursor-1',
          readState: 'unread',
          status: 'accepted',
        },
        headers: {
          'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
        },
      },
    });
  });

  it('fetches messages for a conversation', async () => {
    const messageResponse: BlueskyMessagesResponse = {
      cursor: 'next',
      messages: [],
    };
    const conversations = new TestConversations();
    conversations.response = messageResponse;

    const session = createSession();
    conversations.useSession(session);
    const result = await conversations.getMessages('convo-1', 25, 'cursor-2');

    expect(result).toEqual(messageResponse);
    expect(conversations.lastCall).toEqual({
      endpoint: '/chat.bsky.convo.getMessages',
      accessJwt: session.accessJwt,
      options: {
        params: {
          convoId: 'convo-1',
          limit: '25',
          cursor: 'cursor-2',
        },
        headers: {
          'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
        },
      },
    });
  });

  it('sends a message to a conversation', async () => {
    const sendResponse: BlueskySendMessageResponse = {
      id: 'msg-1',
      rev: '1',
      text: 'Hello there',
      sender: { did: 'did:example:alice' },
      sentAt: '2024-01-01T00:00:00.000Z',
    };
    const conversations = new TestConversations();
    conversations.response = sendResponse;
    const message: BlueskySendMessageInput = { text: 'Hello there' };

    const session = createSession();
    conversations.useSession(session);
    const result = await conversations.sendMessage('convo-1', message);

    expect(result).toEqual(sendResponse);
    expect(conversations.lastCall).toEqual({
      endpoint: '/chat.bsky.convo.sendMessage',
      accessJwt: session.accessJwt,
      options: {
        method: 'POST',
        headers: {
          'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat',
        },
        body: {
          convoId: 'convo-1',
          message,
        },
      },
    });
  });
});
