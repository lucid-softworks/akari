import {
  parseSkyblurUrl,
  skyblurTextOf,
  type SkyblurRecordValue,
} from '@/utils/skyblur';

describe('parseSkyblurUrl', () => {
  it('returns null for nullish / empty input', () => {
    expect(parseSkyblurUrl(undefined)).toBeNull();
    expect(parseSkyblurUrl(null)).toBeNull();
    expect(parseSkyblurUrl('')).toBeNull();
  });

  it('returns null for unparseable urls', () => {
    expect(parseSkyblurUrl('not a url')).toBeNull();
  });

  it('returns null for non-skyblur hosts', () => {
    expect(parseSkyblurUrl('https://example.com/post/did:plc:abc/3kxy')).toBeNull();
  });

  it('parses a valid skyblur post url into a ref', () => {
    expect(parseSkyblurUrl('https://skyblur.uk/post/did:plc:abc/3kxy')).toEqual({
      did: 'did:plc:abc',
      rkey: '3kxy',
      uri: 'at://did:plc:abc/uk.skyblur.post/3kxy',
    });
  });

  it('tolerates a trailing slash and extra path segments', () => {
    expect(parseSkyblurUrl('https://skyblur.uk/post/did:plc:abc/3kxy/')).toEqual({
      did: 'did:plc:abc',
      rkey: '3kxy',
      uri: 'at://did:plc:abc/uk.skyblur.post/3kxy',
    });
  });

  it('decodes percent-encoded did and rkey segments', () => {
    expect(
      parseSkyblurUrl('https://skyblur.uk/post/did%3Aplc%3Aabc/3k%78y'),
    ).toEqual({
      did: 'did:plc:abc',
      rkey: '3kxy',
      uri: 'at://did:plc:abc/uk.skyblur.post/3kxy',
    });
  });

  it('returns null when the path is too short', () => {
    expect(parseSkyblurUrl('https://skyblur.uk/post/did:plc:abc')).toBeNull();
    expect(parseSkyblurUrl('https://skyblur.uk/')).toBeNull();
  });

  it('returns null when the first segment is not "post"', () => {
    expect(parseSkyblurUrl('https://skyblur.uk/feed/did:plc:abc/3kxy')).toBeNull();
  });

  it('returns null when the did segment is not a did', () => {
    expect(parseSkyblurUrl('https://skyblur.uk/post/notadid/3kxy')).toBeNull();
  });
});

describe('skyblurTextOf', () => {
  it('returns undefined when value is undefined', () => {
    expect(skyblurTextOf(undefined)).toBeUndefined();
  });

  it('returns the text field when it is a string', () => {
    const value: SkyblurRecordValue = { text: 'my favourite colour is [red].' };
    expect(skyblurTextOf(value)).toBe('my favourite colour is [red].');
  });

  it('returns an empty string verbatim', () => {
    expect(skyblurTextOf({ text: '' })).toBe('');
  });

  it('returns undefined when text is missing', () => {
    expect(skyblurTextOf({ additional: 'extra' })).toBeUndefined();
    expect(skyblurTextOf({})).toBeUndefined();
  });
});
