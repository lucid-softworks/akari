import { findUnthreadFacet, parseUnthreadUrl, stripUnthreadFromPost } from '@/utils/unthread';

describe('parseUnthreadUrl', () => {
  it('parses a valid unthread.at URL', () => {
    const ref = parseUnthreadUrl(
      'https://unthread.at/did:plc:eob75vcjtmbaef2tn4evc4sl/3ml5rjlassg23',
    );
    expect(ref).toEqual({
      did: 'did:plc:eob75vcjtmbaef2tn4evc4sl',
      rkey: '3ml5rjlassg23',
      url: 'https://unthread.at/did:plc:eob75vcjtmbaef2tn4evc4sl/3ml5rjlassg23',
      atUri: 'at://did:plc:eob75vcjtmbaef2tn4evc4sl/site.standard.document/3ml5rjlassg23',
    });
  });

  it('rejects non-unthread hosts', () => {
    expect(parseUnthreadUrl('https://example.com/did:plc:abc/123')).toBeNull();
    expect(parseUnthreadUrl('https://bsky.app/profile/foo')).toBeNull();
  });

  it('rejects URLs without a DID + rkey', () => {
    expect(parseUnthreadUrl('https://unthread.at/')).toBeNull();
    expect(parseUnthreadUrl('https://unthread.at/did:plc:abc')).toBeNull();
  });

  it('rejects malformed URLs', () => {
    expect(parseUnthreadUrl('not a url')).toBeNull();
    expect(parseUnthreadUrl(undefined)).toBeNull();
    expect(parseUnthreadUrl(null)).toBeNull();
  });
});

describe('findUnthreadFacet', () => {
  it('returns the first unthread link in facets', () => {
    const ref = findUnthreadFacet([
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [
          {
            $type: 'app.bsky.richtext.facet#link',
            uri: 'https://unthread.at/did:plc:abc/rkey1',
          },
        ],
      },
    ]);
    expect(ref?.did).toBe('did:plc:abc');
    expect(ref?.rkey).toBe('rkey1');
  });

  it('skips non-link features', () => {
    const ref = findUnthreadFacet([
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [
          { $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:other' },
        ],
      },
    ]);
    expect(ref).toBeNull();
  });

  it('returns null when no facets are unthread links', () => {
    const ref = findUnthreadFacet([
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [
          { $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com/post' },
        ],
      },
    ]);
    expect(ref).toBeNull();
  });

  it('handles missing facets gracefully', () => {
    expect(findUnthreadFacet(undefined)).toBeNull();
    expect(findUnthreadFacet(null)).toBeNull();
    expect(findUnthreadFacet([])).toBeNull();
  });
});

describe('stripUnthreadFromPost', () => {
  it('removes the linked range and trims trailing whitespace', () => {
    const text = 'Some preview text...\n\nView full post';
    const facets = [
      {
        index: { byteStart: 22, byteEnd: 36 },
        features: [
          { $type: 'app.bsky.richtext.facet#link', uri: 'https://unthread.at/did:plc:abc/rkey1' },
        ],
      },
    ];
    const result = stripUnthreadFromPost(text, facets);
    expect(result.text).toBe('Some preview text...');
    expect(result.facets).toEqual([]);
  });

  it('shifts remaining facet byte indices to compensate for the removal', () => {
    // text: "@alice unthread post"
    //        0          11    17 (after removing "unthread")
    // The mention spans "@alice" (bytes 0..6) and a hashtag "post" later.
    // Removed range: byteStart=7..byteEnd=15 (length 8). Trailing facet at
    // byteStart=16..byteEnd=20 → after removal, byteStart=8..byteEnd=12.
    const text = '@alice unthread post';
    const facets = [
      {
        index: { byteStart: 0, byteEnd: 6 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' }],
      },
      {
        index: { byteStart: 7, byteEnd: 15 },
        features: [
          { $type: 'app.bsky.richtext.facet#link', uri: 'https://unthread.at/did:plc:abc/rkey1' },
        ],
      },
      {
        index: { byteStart: 16, byteEnd: 20 },
        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'post' }],
      },
    ];
    const result = stripUnthreadFromPost(text, facets);
    expect(result.text).toBe('@alice  post');
    expect(result.facets).toEqual([
      {
        index: { byteStart: 0, byteEnd: 6 },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' }],
      },
      {
        index: { byteStart: 8, byteEnd: 12 },
        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'post' }],
      },
    ]);
  });

  it('returns the input unchanged when no unthread facet is present', () => {
    const facets = [
      {
        index: { byteStart: 0, byteEnd: 5 },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' }],
      },
    ];
    const result = stripUnthreadFromPost('hello', facets);
    expect(result.text).toBe('hello');
    expect(result.facets).toBe(facets);
  });
});
