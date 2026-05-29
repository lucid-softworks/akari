import { buildLinkFacets, defaultResolveHandle, detectFacets } from '@/utils/textFacets';

describe('detectFacets', () => {
  it('returns no facets for empty text', async () => {
    expect(await detectFacets('')).toEqual([]);
  });

  it('emits a link facet with correct byte offsets', async () => {
    const facets = await detectFacets('see https://example.com now');
    expect(facets).toHaveLength(1);
    expect(facets[0].features[0]).toEqual({
      $type: 'app.bsky.richtext.facet#link',
      uri: 'https://example.com',
    });
    const { byteStart, byteEnd } = facets[0].index;
    const bytes = new TextEncoder().encode('see https://example.com now');
    expect(new TextDecoder().decode(bytes.slice(byteStart, byteEnd))).toBe('https://example.com');
  });

  it('emits a tag facet for hashtags', async () => {
    const facets = await detectFacets('hello #atproto');
    const tag = facets.find((f) => f.features[0].$type === 'app.bsky.richtext.facet#tag');
    expect(tag?.features[0].tag).toBe('atproto');
  });

  it('resolves mentions to DIDs via the resolver', async () => {
    const resolve = jest.fn().mockResolvedValue('did:plc:resolved');
    const facets = await detectFacets('hi @alice.test', resolve);
    const mention = facets.find((f) => f.features[0].$type === 'app.bsky.richtext.facet#mention');
    expect(mention?.features[0].did).toBe('did:plc:resolved');
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('drops mentions that fail to resolve', async () => {
    const resolve = jest.fn().mockResolvedValue(null);
    const facets = await detectFacets('hi @ghost.test', resolve);
    expect(facets.some((f) => f.features[0].$type === 'app.bsky.richtext.facet#mention')).toBe(false);
  });

  it('resolves each unique handle only once', async () => {
    const resolve = jest.fn().mockResolvedValue('did:plc:x');
    await detectFacets('@a.test @a.test @b.test', resolve);
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('computes UTF-8 byte offsets past multi-byte characters', async () => {
    const text = '😀 https://example.com';
    const facets = await detectFacets(text);
    const { byteStart, byteEnd } = facets[0].index;
    const bytes = new TextEncoder().encode(text);
    expect(new TextDecoder().decode(bytes.slice(byteStart, byteEnd))).toBe('https://example.com');
  });
});

describe('buildLinkFacets', () => {
  it('finds multiple URLs and trims trailing punctuation', () => {
    const facets = buildLinkFacets('a https://one.com, and https://two.com.');
    expect(facets).toHaveLength(2);
    expect(facets[0].features[0].uri).toBe('https://one.com');
    expect(facets[1].features[0].uri).toBe('https://two.com');
  });

  it('returns no facets when there are no links', () => {
    expect(buildLinkFacets('just some text')).toEqual([]);
  });

  it('accounts for multi-byte characters in byte offsets', () => {
    const text = 'café https://x.com';
    const facets = buildLinkFacets(text);
    const { byteStart, byteEnd } = facets[0].index;
    const bytes = new TextEncoder().encode(text);
    expect(new TextDecoder().decode(bytes.slice(byteStart, byteEnd))).toBe('https://x.com');
  });
});

describe('defaultResolveHandle', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('strips a leading @ and returns the resolved DID', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ did: 'did:plc:abc' }),
    });
    global.fetch = fetchMock;
    await expect(defaultResolveHandle('@alice.test')).resolves.toBe('did:plc:abc');
    expect(fetchMock.mock.calls[0][0]).toContain('handle=alice.test');
  });

  it('returns null on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(defaultResolveHandle('alice.test')).resolves.toBeNull();
  });

  it('returns null when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(defaultResolveHandle('alice.test')).resolves.toBeNull();
  });
});
