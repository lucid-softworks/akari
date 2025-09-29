import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { BlueskyNotifications } from './notifications';
import type { BlueskySession } from './types';

describe('BlueskyNotifications', () => {
  const server = setupServer();

  const createSession = (overrides: Partial<BlueskySession> = {}): BlueskySession =>
    ({
      handle: 'user.test',
      did: 'did:plc:123',
      active: true,
      accessJwt: 'jwt-token',
      refreshJwt: 'refresh-token',
      ...overrides,
    } as BlueskySession);

  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    jest.restoreAllMocks();
  });

  afterAll(() => server.close());

  it('fetches notifications with query parameters', async () => {
    const responseData = { notifications: [] };
    let capturedUrl: string | null = null;
    let capturedHeaders: Record<string, string> | null = null;

    server.use(
      http.get('https://custom.pds/xrpc/app.bsky.notification.listNotifications', async ({ request }) => {
        capturedUrl = request.url;
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json(responseData);
      }),
    );

    const client = new BlueskyNotifications('https://custom.pds');
    const session = createSession();
    client.useSession(session);
    const result = await client.listNotifications(10, 'cursor123', ['like', 'follow'], true, '2024-01-01T00:00:00Z');

    expect(result).toEqual(responseData);
    expect(capturedUrl).toBe(
      'https://custom.pds/xrpc/app.bsky.notification.listNotifications?limit=10&cursor=cursor123&priority=true&seenAt=2024-01-01T00%3A00%3A00Z&reasons=like&reasons=follow',
    );
    expect(capturedHeaders).not.toBeNull();
    const headers = capturedHeaders!;
    expect(headers.authorization).toBe('Bearer jwt-token');
    expect(headers['content-type']).toBeUndefined();
  });

  it('throws descriptive errors when notification request fails', async () => {
    server.use(
      http.get('https://bsky.social/xrpc/app.bsky.notification.listNotifications', () =>
        HttpResponse.json({ message: 'Request failed' }, { status: 500, statusText: 'Server Error' }),
      ),
    );

    const client = new BlueskyNotifications();

    const session = createSession();
    client.useSession(session);
    await expect(client.listNotifications()).rejects.toThrow('Request failed');
  });

  it('fetches unread notification counts', async () => {
    const responseData = { count: 5 };
    let capturedHeaders: Record<string, string> | null = null;

    server.use(
      http.get('https://example.pds/xrpc/app.bsky.notification.getUnreadCount', async ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json(responseData);
      }),
    );

    const client = new BlueskyNotifications('https://example.pds');
    const session = createSession();
    client.useSession(session);
    const result = await client.getUnreadCount();

    expect(result).toEqual({ count: 5 });
    expect(capturedHeaders).not.toBeNull();
    const headers = capturedHeaders!;
    expect(headers.authorization).toBe('Bearer jwt-token');
    expect(headers['content-type']).toBeUndefined();
  });

  it('throws fallback errors when unread count json parsing fails', async () => {
    server.use(
      http.get('https://example.pds/xrpc/app.bsky.notification.getUnreadCount', () =>
        HttpResponse.text('not json', { status: 404, statusText: 'Not Found' }),
      ),
    );

    const client = new BlueskyNotifications('https://example.pds');

    const session = createSession();
    client.useSession(session);
    await expect(client.getUnreadCount()).rejects.toThrow('not json');
  });
});
