import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ClearSkyApi } from './api';
import { ClearSkyApiClient } from './client';

function setupFetchMock<T>({
  ok,
  jsonValue,
  status,
}: {
  ok: boolean;
  jsonValue: T;
  status?: number;
}): jest.MockedFunction<typeof fetch> {
  const json = jest.fn(async () => jsonValue);
  const fetchMock = jest
    .fn(async () => ({
      ok,
      status: status ?? (ok ? 200 : 500),
      json,
    } as unknown as Response))
    .mockName('fetch') as jest.MockedFunction<typeof fetch>;

  global.fetch = fetchMock;

  return fetchMock;
}

class TestClient extends ClearSkyApiClient {
  public getPublic<T>(endpoint: string, params?: Record<string, string>) {
    return this.get<T>(endpoint, params);
  }

  public postPublic<T>(
    endpoint: string,
    body?: Record<string, unknown> | FormData,
    params?: Record<string, string>,
  ) {
    return this.post<T>(endpoint, body as Record<string, unknown>, params);
  }
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('ClearSkyApiClient', () => {
  it('makes GET requests with query parameters', async () => {
    const fetchMock = setupFetchMock({ ok: true, jsonValue: { result: 'ok' } });

    const client = new TestClient('https://example.com');
    const data = await client.getPublic('/test', { q: 'search', page: '2' });

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/test?q=search&page=2', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(data).toEqual({ result: 'ok' });
  });

  it('makes POST requests with JSON body', async () => {
    const fetchMock = setupFetchMock({ ok: true, jsonValue: { success: true } });

    const client = new TestClient('https://example.com');
    const body = { foo: 'bar' };
    const data = await client.postPublic('/create', body);

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(data).toEqual({ success: true });
  });

  it('throws error with message from response when request fails', async () => {
    const errorResponse = { message: 'not found' };
    const fetchMock = setupFetchMock({ ok: false, status: 404, jsonValue: errorResponse });

    const client = new TestClient('https://example.com');

    await expect(client.getPublic('/missing')).rejects.toThrow('not found');
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/missing', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('ClearSkyApi', () => {
  it('fetches DID for a handle', async () => {
    const fetchMock = setupFetchMock({ ok: true, jsonValue: { did: 'did:example:123' } });

    const api = new ClearSkyApi('https://example.com');
    const data = await api.getDid('alice');

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/api/v1/anon/get-did/alice', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(data).toEqual({ did: 'did:example:123' });
  });
});
