import { getPdsUrlFromDid, getPdsUrlFromHandle } from './pds';

describe('getPdsUrlFromDid', () => {
  const originalFetch = globalThis.fetch as typeof fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('returns PDS endpoint when service is available', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          service: [{ id: '#atproto_pds', serviceEndpoint: 'https://pds.example.com' }],
        }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const url = await getPdsUrlFromDid('did:example:123');

    expect(url).toBe('https://pds.example.com');
    expect(mockFetch).toHaveBeenCalledWith('https://plc.directory/did:example:123');
  });

  it('returns null when response is not ok', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 } as Response);

    const url = await getPdsUrlFromDid('did:bad');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when service is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ service: [] }),
    });

    const url = await getPdsUrlFromDid('did:noService');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when fetch throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('network error'));

    const url = await getPdsUrlFromDid('did:error');

    expect(url).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('getPdsUrlFromHandle', () => {
  const originalFetch = globalThis.fetch as typeof fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('resolves handle and returns PDS URL', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ did: 'did:example:123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            service: [{ id: '#atproto_pds', serviceEndpoint: 'https://pds.example.com' }],
          }),
      });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const url = await getPdsUrlFromHandle('@alice.test');

    expect(url).toBe('https://pds.example.com');
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=alice.test',
    );
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://plc.directory/did:example:123');
  });

  it('returns null when handle resolution fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 } as Response);

    const url = await getPdsUrlFromHandle('bad.handle');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when no DID is returned', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const url = await getPdsUrlFromHandle('nodid.handle');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when PDS lookup yields no service', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ did: 'did:example:123' }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ service: [] }) });

    const url = await getPdsUrlFromHandle('@alice.test');

    expect(url).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
