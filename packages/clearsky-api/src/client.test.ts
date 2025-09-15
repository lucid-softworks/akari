import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClearSkyApi } from './api';
import { ClearSkyApiClient } from './client';

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
  vi.clearAllMocks();
});

describe('ClearSkyApiClient', () => {
  it('makes GET requests with query parameters', async () => {
    const mockJson = vi.fn().mockResolvedValue({ result: 'ok' });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson } as unknown as Response);

    const client = new TestClient('https://example.com');
    const data = await client.getPublic('/test', { q: 'search', page: '2' });

    expect(fetch).toHaveBeenCalledWith('https://example.com/test?q=search&page=2', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(data).toEqual({ result: 'ok' });
  });

  it('makes POST requests with JSON body', async () => {
    const mockJson = vi.fn().mockResolvedValue({ success: true });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson } as unknown as Response);

    const client = new TestClient('https://example.com');
    const body = { foo: 'bar' };
    const data = await client.postPublic('/create', body);

    expect(fetch).toHaveBeenCalledWith('https://example.com/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(data).toEqual({ success: true });
  });

  it('throws error with message from response when request fails', async () => {
    const errorResponse = { message: 'not found' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue(errorResponse),
    } as unknown as Response);

    const client = new TestClient('https://example.com');

    await expect(client.getPublic('/missing')).rejects.toThrow('not found');
  });
});

describe('ClearSkyApi', () => {
  it('fetches DID for a handle', async () => {
    const mockJson = vi.fn().mockResolvedValue({ did: 'did:example:123' });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: mockJson } as unknown as Response);

    const api = new ClearSkyApi('https://example.com');
    const data = await api.getDid('alice');

    expect(fetch).toHaveBeenCalledWith('https://example.com/api/v1/anon/get-did/alice', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(data).toEqual({ did: 'did:example:123' });
  });
});
