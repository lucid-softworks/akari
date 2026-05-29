import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import type { IncomingMessage, Server, ServerResponse } from 'node:http';

import { createRegistryServer } from './server.js';
import { SubscriptionStore } from './subscription-store.js';
import type { RegistryConfig } from './types.js';

// createRegistryServer wraps http.createServer; we never call .listen(), so no
// socket is opened. The request handler is pulled off the (unstarted) server's
// 'request' listeners and driven directly with fake req/res objects.

type FakeResponse = ServerResponse & {
  statusCode: number;
  headers: Record<string, string>;
  body: string | undefined;
  ended: boolean;
};

function makeResponse(): FakeResponse {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as string | undefined,
    ended: false,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    writeHead(status: number) {
      this.statusCode = status;
      return this;
    },
    end(chunk?: string) {
      this.body = chunk;
      this.ended = true;
      return this;
    },
  };
  return res as unknown as FakeResponse;
}

type RequestOptions = {
  method: string;
  url?: string | undefined;
  headers?: Record<string, string | undefined>;
  body?: unknown;
  rawBody?: string;
  defaultUrl?: boolean;
};

function makeRequest(options: RequestOptions): IncomingMessage {
  const { method, headers = {}, body, rawBody, defaultUrl = true } = options;
  const url = 'url' in options ? options.url : defaultUrl ? '/subscriptions' : undefined;

  let payloadString: string | undefined;
  if (rawBody !== undefined) {
    payloadString = rawBody;
  } else if (body !== undefined) {
    payloadString = JSON.stringify(body);
  }

  const req = {
    method,
    url: url ?? '/subscriptions',
    headers: { host: 'localhost', ...headers },
    async *[Symbol.asyncIterator]() {
      if (payloadString !== undefined) {
        yield Buffer.from(payloadString, 'utf8');
      }
    },
  };

  return req as unknown as IncomingMessage;
}

const servers: Server[] = [];

function getHandler(config: RegistryConfig, store: InstanceType<typeof SubscriptionStore>) {
  const server = createRegistryServer(config, store);
  servers.push(server);
  const listeners = server.listeners('request');
  return listeners[0] as (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

async function invoke(config: RegistryConfig, store: InstanceType<typeof SubscriptionStore>, req: IncomingMessage) {
  const handler = getHandler(config, store);
  const res = makeResponse();
  await handler(req, res);
  return res;
}

const baseConfig: RegistryConfig = {
  host: '0.0.0.0',
  port: 3001,
};

const validBody = {
  did: 'did:plc:abc',
  expoPushToken: 'ExpoToken[xyz]',
  platform: 'ios',
};

beforeEach(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const server of servers.splice(0)) {
    server.close();
  }
});

describe('createRegistryServer wiring', () => {
  it('returns an http server with a request handler', () => {
    const server = createRegistryServer(baseConfig, new SubscriptionStore());
    servers.push(server);
    expect(typeof server.listen).toBe('function');
    expect(server.listeners('request')).toHaveLength(1);
  });
});

describe('CORS and OPTIONS', () => {
  it('sets CORS headers using the request origin', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'OPTIONS', headers: { origin: 'https://app.example' } }),
    );
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example');
    expect(res.headers['access-control-allow-methods']).toBe('GET,POST,DELETE,OPTIONS');
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });

  it('falls back to wildcard origin when none provided', async () => {
    const res = await invoke(baseConfig, new SubscriptionStore(), makeRequest({ method: 'OPTIONS' }));
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('GET /subscriptions', () => {
  it('returns the stored subscriptions', async () => {
    const store = new SubscriptionStore();
    await store.register(validBody);
    const res = await invoke(baseConfig, store, makeRequest({ method: 'GET' }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!)).toEqual([{ did: 'did:plc:abc', tokens: ['ExpoToken[xyz]'] }]);
  });

  it('returns 401 when admin token is set and missing', async () => {
    const res = await invoke(
      { ...baseConfig, adminToken: 'secret' },
      new SubscriptionStore(),
      makeRequest({ method: 'GET' }),
    );
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Invalid or missing authorization token.' });
  });

  it('returns 401 when admin token is wrong', async () => {
    const res = await invoke(
      { ...baseConfig, adminToken: 'secret' },
      new SubscriptionStore(),
      makeRequest({ method: 'GET', headers: { authorization: 'Bearer wrong' } }),
    );
    expect(res.statusCode).toBe(401);
  });

  it('succeeds with the correct admin bearer token', async () => {
    const res = await invoke(
      { ...baseConfig, adminToken: 'secret' },
      new SubscriptionStore(),
      makeRequest({ method: 'GET', headers: { authorization: 'Bearer secret' } }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!)).toEqual([]);
  });

  it('trims whitespace around the provided bearer token', async () => {
    const res = await invoke(
      { ...baseConfig, adminToken: 'secret' },
      new SubscriptionStore(),
      makeRequest({ method: 'GET', headers: { authorization: 'Bearer   secret  ' } }),
    );
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 when the authorization header lacks the Bearer prefix', async () => {
    const res = await invoke(
      { ...baseConfig, adminToken: 'secret' },
      new SubscriptionStore(),
      makeRequest({ method: 'GET', headers: { authorization: 'secret' } }),
    );
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /subscriptions', () => {
  it('registers a subscription and returns the total tokens', async () => {
    const store = new SubscriptionStore();
    const res = await invoke(baseConfig, store, makeRequest({ method: 'POST', body: validBody }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!)).toEqual({ success: true, totalTokens: 1 });
    expect(store.getAll()).toEqual([{ did: 'did:plc:abc', tokens: ['ExpoToken[xyz]'] }]);
  });

  it('accepts an optional devicePushToken', async () => {
    const store = new SubscriptionStore();
    const res = await invoke(
      baseConfig,
      store,
      makeRequest({ method: 'POST', body: { ...validBody, devicePushToken: 'device-1' } }),
    );
    expect(res.statusCode).toBe(200);
  });

  it('enforces the client token', async () => {
    const res = await invoke(
      { ...baseConfig, clientToken: 'client-secret' },
      new SubscriptionStore(),
      makeRequest({ method: 'POST', body: validBody }),
    );
    expect(res.statusCode).toBe(401);
  });

  it('succeeds with the correct client token', async () => {
    const res = await invoke(
      { ...baseConfig, clientToken: 'client-secret' },
      new SubscriptionStore(),
      makeRequest({ method: 'POST', body: validBody, headers: { authorization: 'Bearer client-secret' } }),
    );
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 when the did is missing', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'POST', body: { expoPushToken: 'x', platform: 'ios' } }),
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Request body must include a did.' });
  });

  it('returns 400 when the expo token is missing', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'POST', body: { did: 'did:plc:abc', platform: 'ios' } }),
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Request body must include an Expo push token.' });
  });

  it('returns 400 when the platform is missing', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'POST', body: { did: 'did:plc:abc', expoPushToken: 'x' } }),
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Request body must include a platform.' });
  });

  it('ignores non-string fields and reports them as missing', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'POST', body: { did: 123, expoPushToken: 'x', platform: 'ios' } }),
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Request body must include a did.' });
  });

  it('drops a non-string devicePushToken without error', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'POST', body: { ...validBody, devicePushToken: 123 } }),
    );
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 when the body is not an object', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'POST', rawBody: '"a string"' }),
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Request body must be an object.' });
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'POST', rawBody: '{not json' }),
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!).error).toMatch(/Failed to parse request body:/);
  });

  it('treats an empty body as an empty object (missing did)', async () => {
    const res = await invoke(baseConfig, new SubscriptionStore(), makeRequest({ method: 'POST' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Request body must include a did.' });
  });
});

describe('DELETE /subscriptions', () => {
  it('removes a subscription and reports success', async () => {
    const store = new SubscriptionStore();
    await store.register(validBody);
    const res = await invoke(baseConfig, store, makeRequest({ method: 'DELETE', body: validBody }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!)).toEqual({ success: true, totalTokens: 0 });
    expect(store.getAll()).toEqual([]);
  });

  it('reports success:false when the token was not registered', async () => {
    const store = new SubscriptionStore();
    const res = await invoke(baseConfig, store, makeRequest({ method: 'DELETE', body: validBody }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!)).toEqual({ success: false, totalTokens: 0 });
  });

  it('enforces the client token', async () => {
    const res = await invoke(
      { ...baseConfig, clientToken: 'client-secret' },
      new SubscriptionStore(),
      makeRequest({ method: 'DELETE', body: validBody }),
    );
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 on an invalid payload', async () => {
    const res = await invoke(
      baseConfig,
      new SubscriptionStore(),
      makeRequest({ method: 'DELETE', body: { platform: 'ios' } }),
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('unknown routes', () => {
  it('returns 404 for an unknown path', async () => {
    const res = await invoke(baseConfig, new SubscriptionStore(), makeRequest({ method: 'GET', url: '/unknown' }));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Not found.' });
  });

  it('returns 404 for an unsupported method on /subscriptions', async () => {
    const res = await invoke(baseConfig, new SubscriptionStore(), makeRequest({ method: 'PUT' }));
    expect(res.statusCode).toBe(404);
  });

  it('handles a request with no url (empty pathname)', async () => {
    const req = {
      method: 'GET',
      url: undefined,
      headers: { host: 'localhost' },
      async *[Symbol.asyncIterator]() {},
    } as unknown as IncomingMessage;
    const res = await invoke(baseConfig, new SubscriptionStore(), req);
    expect(res.statusCode).toBe(404);
  });

  it('handles a request missing the host header', async () => {
    const req = {
      method: 'GET',
      url: '/unknown',
      headers: {},
      async *[Symbol.asyncIterator]() {},
    } as unknown as IncomingMessage;
    const res = await invoke(baseConfig, new SubscriptionStore(), req);
    expect(res.statusCode).toBe(404);
  });
});

describe('error handling', () => {
  it('returns 400 when the store throws', async () => {
    const store = new SubscriptionStore();
    jest.spyOn(store, 'register').mockRejectedValue(new Error('boom'));
    const res = await invoke(baseConfig, store, makeRequest({ method: 'POST', body: validBody }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toEqual({ error: 'boom' });
  });

  it('falls back to a generic message for non-Error throws', async () => {
    const store = new SubscriptionStore();
    jest.spyOn(store, 'register').mockRejectedValue('weird');
    const res = await invoke(baseConfig, store, makeRequest({ method: 'POST', body: validBody }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body!)).toEqual({ error: 'Unexpected error.' });
  });
});
