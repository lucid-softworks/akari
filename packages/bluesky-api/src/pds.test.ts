import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { getPdsUrlFromDid, getPdsUrlFromHandle } from './pds';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  jest.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe('getPdsUrlFromDid', () => {
  it('returns PDS endpoint when service is available', async () => {
    let requestedUrl: string | undefined;

    server.use(
      http.get('https://plc.directory/:did', ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          service: [{ id: '#atproto_pds', serviceEndpoint: 'https://pds.example.com' }],
        });
      }),
    );

    const url = await getPdsUrlFromDid('did:example:123');

    expect(url).toBe('https://pds.example.com');
    expect(requestedUrl).toBe('https://plc.directory/did:example:123');
  });

  it('returns null when response is not ok', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.get('https://plc.directory/:did', () =>
        HttpResponse.json({}, { status: 404, statusText: 'Not Found' }),
      ),
    );

    const url = await getPdsUrlFromDid('did:bad');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when service is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.get('https://plc.directory/:did', () =>
        HttpResponse.json({ service: [] }),
      ),
    );

    const url = await getPdsUrlFromDid('did:noService');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when fetch throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('https://plc.directory/:did', () => HttpResponse.error()),
    );

    const url = await getPdsUrlFromDid('did:error');

    expect(url).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('getPdsUrlFromHandle', () => {
  it('resolves handle and returns PDS URL', async () => {
    let resolveHandleUrl: string | undefined;
    let plcUrl: string | undefined;

    server.use(
      http.get('https://bsky.social/xrpc/com.atproto.identity.resolveHandle', ({ request }) => {
        resolveHandleUrl = request.url;
        return HttpResponse.json({ did: 'did:example:123' });
      }),
      http.get('https://plc.directory/:did', ({ request }) => {
        plcUrl = request.url;
        return HttpResponse.json({
          service: [{ id: '#atproto_pds', serviceEndpoint: 'https://pds.example.com' }],
        });
      }),
    );

    const url = await getPdsUrlFromHandle('@alice.test');

    expect(url).toBe('https://pds.example.com');
    expect(resolveHandleUrl).toBe(
      'https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=alice.test',
    );
    expect(plcUrl).toBe('https://plc.directory/did:example:123');
  });

  it('returns null when handle resolution fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.get('https://bsky.social/xrpc/com.atproto.identity.resolveHandle', () =>
        HttpResponse.json({}, { status: 500, statusText: 'Server Error' }),
      ),
    );

    const url = await getPdsUrlFromHandle('bad.handle');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when no DID is returned', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.get('https://bsky.social/xrpc/com.atproto.identity.resolveHandle', () =>
        HttpResponse.json({}),
      ),
    );

    const url = await getPdsUrlFromHandle('nodid.handle');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when PDS lookup yields no service', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    server.use(
      http.get('https://bsky.social/xrpc/com.atproto.identity.resolveHandle', () =>
        HttpResponse.json({ did: 'did:example:123' }),
      ),
      http.get('https://plc.directory/:did', () => HttpResponse.json({ service: [] })),
    );

    const url = await getPdsUrlFromHandle('@alice.test');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
