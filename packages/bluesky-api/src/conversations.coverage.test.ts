import { BlueskyConversations } from './conversations';
import type { BlueskyConvoView } from './types';

const CHAT_PROXY = 'did:web:api.bsky.chat#bsky_chat';

type AuthOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData | Blob;
  params?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

describe('BlueskyConversations (coverage)', () => {
  class TestConversations extends BlueskyConversations {
    public authCalls: { endpoint: string; accessJwt: string; options: AuthOptions }[] = [];
    public responses: unknown[] = [];

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: AuthOptions = {},
    ): Promise<T> {
      this.authCalls.push({ endpoint, accessJwt, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  const convo = { convo: { id: 'convo-1' } as BlueskyConvoView };

  it('updateRead posts the convoId with the chat proxy header', async () => {
    const client = new TestConversations();
    client.responses = [undefined];

    await client.updateRead('jwt', 'convo-1');

    expect(client.authCalls).toHaveLength(1);
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.updateRead');
    expect(call.accessJwt).toBe('jwt');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1' });
  });

  it('getConvoForMembers passes members as a params array', async () => {
    const client = new TestConversations();
    client.responses = [convo];

    const result = await client.getConvoForMembers('jwt', ['did:a', 'did:b']);

    expect(result).toEqual(convo);
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.getConvoForMembers');
    expect(call.accessJwt).toBe('jwt');
    expect(call.options.method).toBeUndefined();
    expect(call.options.params).toEqual({ members: ['did:a', 'did:b'] });
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
  });

  it('getConvo fetches a single convo by id', async () => {
    const client = new TestConversations();
    client.responses = [convo];

    const result = await client.getConvo('jwt', 'convo-1');

    expect(result).toEqual(convo);
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.getConvo');
    expect(call.options.params).toEqual({ convoId: 'convo-1' });
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
  });

  it('leaveConvo posts the convoId', async () => {
    const client = new TestConversations();
    client.responses = [{ convoId: 'convo-1', rev: 'rev-1' }];

    const result = await client.leaveConvo('jwt', 'convo-1');

    expect(result).toEqual({ convoId: 'convo-1', rev: 'rev-1' });
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.leaveConvo');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1' });
  });

  it('addMembers posts convoId and dids', async () => {
    const client = new TestConversations();
    client.responses = [convo];

    const result = await client.addMembers('jwt', 'convo-1', ['did:a', 'did:b']);

    expect(result).toEqual(convo);
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.addMembers');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1', dids: ['did:a', 'did:b'] });
  });

  it('removeMembers posts convoId and dids', async () => {
    const client = new TestConversations();
    client.responses = [convo];

    const result = await client.removeMembers('jwt', 'convo-1', ['did:a']);

    expect(result).toEqual(convo);
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.removeMembers');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1', dids: ['did:a'] });
  });

  it('updateConvoName posts convoId and name', async () => {
    const client = new TestConversations();
    client.responses = [convo];

    const result = await client.updateConvoName('jwt', 'convo-1', 'New Name');

    expect(result).toEqual(convo);
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.updateConvoName');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1', name: 'New Name' });
  });

  it('muteConvo posts the convoId', async () => {
    const client = new TestConversations();
    client.responses = [convo];

    const result = await client.muteConvo('jwt', 'convo-1');

    expect(result).toEqual(convo);
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.muteConvo');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1' });
  });

  it('unmuteConvo posts the convoId', async () => {
    const client = new TestConversations();
    client.responses = [convo];

    const result = await client.unmuteConvo('jwt', 'convo-1');

    expect(result).toEqual(convo);
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.unmuteConvo');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1' });
  });

  it('addReaction posts convoId, messageId and value', async () => {
    const client = new TestConversations();
    client.responses = [{ message: { id: 'msg-1' } }];

    const result = await client.addReaction('jwt', 'convo-1', 'msg-1', '👍');

    expect(result).toEqual({ message: { id: 'msg-1' } });
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.addReaction');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1', messageId: 'msg-1', value: '👍' });
  });

  it('removeReaction posts convoId, messageId and value', async () => {
    const client = new TestConversations();
    client.responses = [{ message: { id: 'msg-1' } }];

    const result = await client.removeReaction('jwt', 'convo-1', 'msg-1', '👍');

    expect(result).toEqual({ message: { id: 'msg-1' } });
    const call = client.authCalls[0];
    expect(call.endpoint).toBe('/chat.bsky.convo.removeReaction');
    expect(call.options.method).toBe('POST');
    expect(call.options.headers).toEqual({ 'atproto-proxy': CHAT_PROXY });
    expect(call.options.body).toEqual({ convoId: 'convo-1', messageId: 'msg-1', value: '👍' });
  });
});
