import { cdnImageUrl, rewriteCdnUrl } from '@/utils/cdn';

const mockReadAppViewSettings = jest.fn();
const mockResolveCdnHost = jest.fn();

jest.mock('@/hooks/useAppViewSettings', () => ({
  readAppViewSettings: () => mockReadAppViewSettings(),
}));

jest.mock('@/utils/appView', () => ({
  resolveCdnHost: (config: unknown) => mockResolveCdnHost(config),
}));

describe('rewriteCdnUrl', () => {
  beforeEach(() => {
    mockReadAppViewSettings.mockReset();
    mockResolveCdnHost.mockReset();
    mockReadAppViewSettings.mockReturnValue({ cdnPreset: 'bsky' });
  });

  it('returns undefined for nullish input', () => {
    expect(rewriteCdnUrl(null)).toBeUndefined();
    expect(rewriteCdnUrl(undefined)).toBeUndefined();
    // Host resolution should never be consulted for falsy input.
    expect(mockResolveCdnHost).not.toHaveBeenCalled();
  });

  it('returns the empty string verbatim for empty input (not nullish)', () => {
    expect(rewriteCdnUrl('')).toBe('');
    expect(mockResolveCdnHost).not.toHaveBeenCalled();
  });

  it('returns the url unchanged when no CDN override is active', () => {
    mockResolveCdnHost.mockReturnValue(undefined);
    const url = 'https://cdn.bsky.app/img/avatar/plain/did/cid@jpeg';
    expect(rewriteCdnUrl(url)).toBe(url);
  });

  it('rewrites the host for each known bsky CDN host', () => {
    mockResolveCdnHost.mockReturnValue('https://cdn.blueat.net');
    const path = '/img/feed_thumbnail/plain/did:plc:abc/bafy@jpeg';
    expect(rewriteCdnUrl(`https://cdn.bsky.app${path}`)).toBe(
      `https://cdn.blueat.net${path}`,
    );
    expect(rewriteCdnUrl(`https://cdn.bsky.social${path}`)).toBe(
      `https://cdn.blueat.net${path}`,
    );
    expect(rewriteCdnUrl(`https://public.cdn.bsky.app${path}`)).toBe(
      `https://cdn.blueat.net${path}`,
    );
  });

  it('leaves non-matching hosts untouched even with an override active', () => {
    mockResolveCdnHost.mockReturnValue('https://cdn.blueat.net');
    const tenor = 'https://media.tenor.com/abc/def.gif';
    expect(rewriteCdnUrl(tenor)).toBe(tenor);
    const local = 'file:///var/tmp/photo.jpg';
    expect(rewriteCdnUrl(local)).toBe(local);
  });
});

describe('cdnImageUrl', () => {
  beforeEach(() => {
    mockReadAppViewSettings.mockReset();
    mockResolveCdnHost.mockReset();
    mockReadAppViewSettings.mockReturnValue({ cdnPreset: 'bsky' });
  });

  it('synthesises a cdn.bsky.app url with the default jpeg format', () => {
    mockResolveCdnHost.mockReturnValue(undefined);
    expect(
      cdnImageUrl({ size: 'avatar', did: 'did:plc:abc', blobRef: 'bafy' }),
    ).toBe('https://cdn.bsky.app/img/avatar/plain/did:plc:abc/bafy@jpeg');
  });

  it('honours an explicit png format', () => {
    mockResolveCdnHost.mockReturnValue(undefined);
    expect(
      cdnImageUrl({
        size: 'feed_fullsize',
        did: 'did:plc:abc',
        blobRef: 'bafy',
        format: 'png',
      }),
    ).toBe('https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:abc/bafy@png');
  });

  it('routes the synthesised url through the rewrite when an override is active', () => {
    mockResolveCdnHost.mockReturnValue('https://cdn.blueat.net');
    expect(
      cdnImageUrl({ size: 'banner', did: 'did:plc:abc', blobRef: 'bafy' }),
    ).toBe('https://cdn.blueat.net/img/banner/plain/did:plc:abc/bafy@jpeg');
  });
});
