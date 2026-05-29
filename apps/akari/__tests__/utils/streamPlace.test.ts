import {
  STREAM_PLACE_DEFAULT_HOST,
  fetchStreamPlacePlaybackServers,
  isStreamPlaceUri,
  negotiateStreamPlaceWhep,
} from '@/utils/streamPlace';

describe('STREAM_PLACE_DEFAULT_HOST', () => {
  it('is the canonical stream.place origin', () => {
    expect(STREAM_PLACE_DEFAULT_HOST).toBe('https://stream.place');
  });
});

describe('isStreamPlaceUri', () => {
  it('returns false for nullish input', () => {
    expect(isStreamPlaceUri(undefined)).toBe(false);
    expect(isStreamPlaceUri(null)).toBe(false);
    expect(isStreamPlaceUri('')).toBe(false);
  });

  it('returns false for an unparseable uri', () => {
    expect(isStreamPlaceUri('not a url')).toBe(false);
  });

  it('matches stream.place', () => {
    expect(isStreamPlaceUri('https://stream.place/alice')).toBe(true);
  });

  it('matches streamplace.com', () => {
    expect(isStreamPlaceUri('https://streamplace.com/alice')).toBe(true);
  });

  it('strips a leading www. and lowercases the host', () => {
    expect(isStreamPlaceUri('https://WWW.Stream.Place/alice')).toBe(true);
  });

  it('rejects subdomains that are not the bare allowed host', () => {
    expect(isStreamPlaceUri('https://cdn.stream.place/alice')).toBe(false);
  });

  it('rejects unrelated hosts', () => {
    expect(isStreamPlaceUri('https://youtube.com/watch')).toBe(false);
  });
});

describe('negotiateStreamPlaceWhep', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('posts the SDP offer to the default host and returns the answer', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('answer-sdp'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await negotiateStreamPlaceWhep('did:plc:alice', 'offer-sdp');

    expect(result).toEqual({ sdp: 'answer-sdp' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://stream.place/xrpc/place.stream.playback.whep?streamer=did%3Aplc%3Aalice&rendition=source',
    );
    expect(init.method).toBe('POST');
    expect(init.body).toBe('offer-sdp');
    expect(init.headers).toEqual({
      'Content-Type': 'application/sdp',
      Accept: 'application/sdp',
    });
  });

  it('honors a custom playback host, rendition, and abort signal', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('answer-sdp'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const controller = new AbortController();

    await negotiateStreamPlaceWhep('did:plc:bob', 'offer', {
      playbackHost: 'https://edge.example',
      rendition: '720p',
      signal: controller.signal,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://edge.example/xrpc/place.stream.playback.whep?streamer=did%3Aplc%3Abob&rendition=720p',
    );
    expect(init.signal).toBe(controller.signal);
  });

  it('throws with the response body text when the request is not ok', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: jest.fn().mockResolvedValue('upstream down'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(negotiateStreamPlaceWhep('did:plc:alice', 'offer')).rejects.toThrow(
      'WHEP negotiation failed (503): upstream down',
    );
  });

  it('swallows a body-read error on a failed response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockRejectedValue(new Error('read failed')),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(negotiateStreamPlaceWhep('did:plc:alice', 'offer')).rejects.toThrow(
      'WHEP negotiation failed (500): ',
    );
  });

  it('throws when the answer body is empty', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(negotiateStreamPlaceWhep('did:plc:alice', 'offer')).rejects.toThrow(
      'WHEP negotiation returned an empty SDP answer',
    );
  });
});

describe('fetchStreamPlacePlaybackServers', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('requests the default lookup host and returns string servers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ servers: ['https://a.example', 'https://b.example'] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchStreamPlacePlaybackServers('did:plc:alice');

    expect(result).toEqual({ servers: ['https://a.example', 'https://b.example'] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://stream.place/xrpc/place.stream.playback.getPlaybackServer?stream=did%3Aplc%3Aalice',
    );
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ Accept: 'application/json' });
  });

  it('honors a custom lookup host and abort signal', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ servers: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const controller = new AbortController();

    await fetchStreamPlacePlaybackServers('did:plc:bob', {
      lookupHost: 'https://lookup.example',
      signal: controller.signal,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://lookup.example/xrpc/place.stream.playback.getPlaybackServer?stream=did%3Aplc%3Abob',
    );
    expect(init.signal).toBe(controller.signal);
  });

  it('filters out non-string entries from the servers array', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ servers: ['https://a.example', 42, null, { x: 1 }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchStreamPlacePlaybackServers('did:plc:alice');
    expect(result).toEqual({ servers: ['https://a.example'] });
  });

  it('returns an empty list when servers is missing or not an array', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ servers: 'nope' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchStreamPlacePlaybackServers('did:plc:alice');
    expect(result).toEqual({ servers: [] });
  });

  it('returns an empty list when the response omits servers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchStreamPlacePlaybackServers('did:plc:alice');
    expect(result).toEqual({ servers: [] });
  });

  it('throws when the lookup response is not ok', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn(),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchStreamPlacePlaybackServers('did:plc:alice')).rejects.toThrow(
      'getPlaybackServer failed (404)',
    );
  });
});
