import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SubscriptionStore } from './subscription-store.js';
import type { NotifierRegistryConfig } from './types.js';

const ENDPOINT = 'https://registry.example/subscriptions';

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number; statusText?: string }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    json: async () => body,
  } as unknown as Response;
}

describe('SubscriptionStore', () => {
  let fetchMock: jest.Mock<(input: unknown, init?: unknown) => Promise<Response>>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn<(input: unknown, init?: unknown) => Promise<Response>>();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('loads subscriptions on start and resolves them by normalised did', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([{ did: 'DID:PLC:ABC', tokens: ['t1'] }]),
    );

    const store = new SubscriptionStore({ endpoint: ENDPOINT });
    await store.start();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.get('did:plc:abc')).toEqual({ did: 'DID:PLC:ABC', tokens: ['t1'] });
    // lookup is case-insensitive via normalisation
    expect(store.get('DID:PLC:ABC')).toEqual({ did: 'DID:PLC:ABC', tokens: ['t1'] });
    store.stop();
  });

  it('sends the bearer token header when configured', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ did: 'did:plc:a', tokens: ['t'] }]));
    const config: NotifierRegistryConfig = { endpoint: ENDPOINT, bearerToken: 'sekret' };
    const store = new SubscriptionStore(config);
    await store.start();

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer sekret');
    expect((options.headers as Record<string, string>)['content-type']).toBe('application/json');
    store.stop();
  });

  it('omits the Authorization header when no bearer token is set', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ did: 'did:plc:a', tokens: ['t'] }]));
    const store = new SubscriptionStore({ endpoint: ENDPOINT });
    await store.start();

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>).Authorization).toBeUndefined();
    store.stop();
  });

  it('throws on start when the registry responds with a non-ok status', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(null, { ok: false, status: 500, statusText: 'Server Error' }),
    );
    const store = new SubscriptionStore({ endpoint: ENDPOINT });
    await expect(store.start()).rejects.toThrow(
      'Registry request failed with status 500 Server Error',
    );
  });

  it('throws on start when the payload fails to parse', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ did: '', tokens: [] }]));
    const store = new SubscriptionStore({ endpoint: ENDPOINT });
    await expect(store.start()).rejects.toThrow('missing a valid did');
  });

  it('wraps a non-Error rejection into an Error on start', async () => {
    fetchMock.mockRejectedValue('network down');
    const store = new SubscriptionStore({ endpoint: ENDPOINT });
    await expect(store.start()).rejects.toThrow('Failed to load subscription registry.');
  });

  it('does not throw on a background refresh failure and keeps prior data', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ did: 'did:plc:a', tokens: ['t1'] }]))
      .mockRejectedValueOnce(new Error('temporary failure'));

    const store = new SubscriptionStore({ endpoint: ENDPOINT, refreshIntervalMs: 30_000 });
    await store.start();
    expect(store.get('did:plc:a')).toBeDefined();

    // trigger the interval-based refresh which fails
    await jest.advanceTimersByTimeAsync(30_000);

    // background failure should not clear existing subscriptions
    expect(store.get('did:plc:a')).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    store.stop();
  });

  it('refreshes subscriptions on the interval and applies new data', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ did: 'did:plc:a', tokens: ['t1'] }]))
      .mockResolvedValueOnce(jsonResponse([{ did: 'did:plc:b', tokens: ['t2'] }]));

    const store = new SubscriptionStore({ endpoint: ENDPOINT, refreshIntervalMs: 45_000 });
    await store.start();
    expect(store.get('did:plc:a')).toBeDefined();

    await jest.advanceTimersByTimeAsync(45_000);

    expect(store.get('did:plc:b')).toBeDefined();
    expect(store.get('did:plc:a')).toBeUndefined();
    store.stop();
  });

  it('get returns undefined for a null/empty did', () => {
    const store = new SubscriptionStore({ endpoint: ENDPOINT });
    expect(store.get(null)).toBeUndefined();
    expect(store.get('')).toBeUndefined();
  });

  it('stop is safe to call when no timer is running', () => {
    const store = new SubscriptionStore({ endpoint: ENDPOINT });
    expect(() => store.stop()).not.toThrow();
  });
});
