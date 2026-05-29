import {
  isTokimekiPollUrl,
  pollEmbedUrlFromRecord,
  pollUriFromEmbedUrl,
} from '@/utils/tokimekiPoll';

describe('isTokimekiPollUrl', () => {
  it('matches http and https poll viewer urls', () => {
    expect(isTokimekiPollUrl('https://poll.tokimeki.tech/p/did:plc:abc/3kxy')).toBe(true);
    expect(isTokimekiPollUrl('http://poll.tokimeki.tech/p/did:plc:abc/3kxy')).toBe(true);
  });

  it('is case-insensitive on the scheme/host', () => {
    expect(isTokimekiPollUrl('HTTPS://POLL.TOKIMEKI.TECH/p/x')).toBe(true);
  });

  it('does not match other hosts or paths', () => {
    expect(isTokimekiPollUrl('https://poll.tokimeki.tech/q/x')).toBe(false);
    expect(isTokimekiPollUrl('https://example.com/p/x')).toBe(false);
    expect(isTokimekiPollUrl('not a url')).toBe(false);
  });
});

describe('pollUriFromEmbedUrl', () => {
  it('converts a valid viewer url into the poll record at:// uri', () => {
    expect(
      pollUriFromEmbedUrl('https://poll.tokimeki.tech/p/did:plc:abc/3kxy?options=4'),
    ).toBe('at://did:plc:abc/tech.tokimeki.poll.poll/3kxy');
  });

  it('returns null for non-tokimeki hosts', () => {
    expect(pollUriFromEmbedUrl('https://example.com/p/did:plc:abc/3kxy')).toBeNull();
  });

  it('returns null when the path is not a /p/<did>/<rkey> shape', () => {
    expect(pollUriFromEmbedUrl('https://poll.tokimeki.tech/q/did:plc:abc/3kxy')).toBeNull();
    expect(pollUriFromEmbedUrl('https://poll.tokimeki.tech/p/did:plc:abc')).toBeNull();
  });

  it('returns null when the did segment is not a did', () => {
    expect(pollUriFromEmbedUrl('https://poll.tokimeki.tech/p/notadid/3kxy')).toBeNull();
  });

  it('returns null when the rkey is empty', () => {
    expect(pollUriFromEmbedUrl('https://poll.tokimeki.tech/p/did:plc:abc/')).toBeNull();
  });

  it('returns null for unparseable urls', () => {
    expect(pollUriFromEmbedUrl('not a url')).toBeNull();
  });
});

describe('pollEmbedUrlFromRecord', () => {
  it('builds a viewer url from a poll record at:// uri', () => {
    expect(
      pollEmbedUrlFromRecord('at://did:plc:abc/tech.tokimeki.poll.poll/3kxy', 4),
    ).toBe('https://poll.tokimeki.tech/p/did:plc:abc/3kxy?options=4');
  });

  it('returns null when the uri is missing a did or rkey', () => {
    expect(pollEmbedUrlFromRecord('at://', 4)).toBeNull();
    expect(pollEmbedUrlFromRecord('at://did:plc:abc/tech.tokimeki.poll.poll/', 4)).toBeNull();
    expect(pollEmbedUrlFromRecord('at://did:plc:abc', 4)).toBeNull();
  });

  it('round-trips with pollUriFromEmbedUrl', () => {
    const uri = 'at://did:plc:abc/tech.tokimeki.poll.poll/3kxy';
    const url = pollEmbedUrlFromRecord(uri, 2);
    expect(url).not.toBeNull();
    expect(pollUriFromEmbedUrl(url as string)).toBe(uri);
  });
});
