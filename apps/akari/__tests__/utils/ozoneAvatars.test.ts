import {
  fetchAvatarsByDid,
  fetchProfilesByDid,
  subjectDid,
} from '@/utils/ozoneAvatars';
import type { BlueskyApi } from '@/bluesky-api';

function makeApi(getProfiles: jest.Mock): BlueskyApi {
  return { getProfiles } as unknown as BlueskyApi;
}

describe('fetchAvatarsByDid', () => {
  it('returns an empty map when no valid DIDs are supplied', async () => {
    const getProfiles = jest.fn();
    const out = await fetchAvatarsByDid(makeApi(getProfiles), 'jwt', []);
    expect(out.size).toBe(0);
    expect(getProfiles).not.toHaveBeenCalled();
  });

  it('filters out non-did entries and dedupes', async () => {
    const getProfiles = jest.fn().mockResolvedValue({
      profiles: [
        { did: 'did:plc:a', avatar: 'https://cdn/a.jpg' },
        { did: 'did:plc:b', avatar: 'https://cdn/b.jpg' },
      ],
    });
    const out = await fetchAvatarsByDid(makeApi(getProfiles), 'jwt', [
      'did:plc:a',
      'did:plc:a',
      'did:plc:b',
      'not-a-did',
      '',
    ]);
    expect(getProfiles).toHaveBeenCalledTimes(1);
    expect(getProfiles).toHaveBeenCalledWith('jwt', ['did:plc:a', 'did:plc:b']);
    expect(out.get('did:plc:a')).toBe('https://cdn/a.jpg');
    expect(out.get('did:plc:b')).toBe('https://cdn/b.jpg');
    expect(out.size).toBe(2);
  });

  it('returns empty map when all DIDs are invalid', async () => {
    const getProfiles = jest.fn();
    const out = await fetchAvatarsByDid(makeApi(getProfiles), 'jwt', [
      'nope',
      'also-nope',
    ]);
    expect(out.size).toBe(0);
    expect(getProfiles).not.toHaveBeenCalled();
  });

  it('skips profiles missing a did or a string avatar', async () => {
    const getProfiles = jest.fn().mockResolvedValue({
      profiles: [
        { did: 'did:plc:a', avatar: 'https://cdn/a.jpg' },
        { did: 'did:plc:b' }, // no avatar
        { did: 'did:plc:c', avatar: null }, // non-string avatar
        { avatar: 'https://cdn/orphan.jpg' }, // no did
      ],
    });
    const out = await fetchAvatarsByDid(makeApi(getProfiles), 'jwt', [
      'did:plc:a',
      'did:plc:b',
      'did:plc:c',
    ]);
    expect(out.size).toBe(1);
    expect(out.get('did:plc:a')).toBe('https://cdn/a.jpg');
  });

  it('chunks requests in batches of 25', async () => {
    const dids = Array.from({ length: 60 }, (_, i) => `did:plc:${i}`);
    const getProfiles = jest.fn().mockResolvedValue({ profiles: [] });
    await fetchAvatarsByDid(makeApi(getProfiles), 'jwt', dids);
    expect(getProfiles).toHaveBeenCalledTimes(3);
    expect(getProfiles.mock.calls[0][1]).toHaveLength(25);
    expect(getProfiles.mock.calls[1][1]).toHaveLength(25);
    expect(getProfiles.mock.calls[2][1]).toHaveLength(10);
  });

  it('swallows errors and falls back to a partial/empty map', async () => {
    const getProfiles = jest.fn().mockRejectedValue(new Error('boom'));
    const out = await fetchAvatarsByDid(makeApi(getProfiles), 'jwt', ['did:plc:a']);
    expect(out.size).toBe(0);
  });

  it('keeps results from successful chunks when a later chunk fails', async () => {
    const dids = Array.from({ length: 26 }, (_, i) => `did:plc:${i}`);
    const getProfiles = jest
      .fn()
      .mockResolvedValueOnce({
        profiles: [{ did: 'did:plc:0', avatar: 'https://cdn/0.jpg' }],
      })
      .mockRejectedValueOnce(new Error('boom'));
    const out = await fetchAvatarsByDid(makeApi(getProfiles), 'jwt', dids);
    expect(out.get('did:plc:0')).toBe('https://cdn/0.jpg');
    expect(out.size).toBe(1);
  });
});

describe('fetchProfilesByDid', () => {
  it('returns an empty map when no valid DIDs are supplied', async () => {
    const getProfiles = jest.fn();
    const out = await fetchProfilesByDid(makeApi(getProfiles), 'jwt', []);
    expect(out.size).toBe(0);
    expect(getProfiles).not.toHaveBeenCalled();
  });

  it('returns full profile-lite blobs and normalizes non-string fields to undefined', async () => {
    const getProfiles = jest.fn().mockResolvedValue({
      profiles: [
        {
          did: 'did:plc:a',
          avatar: 'https://cdn/a.jpg',
          handle: 'alice.test',
          displayName: 'Alice',
        },
        {
          did: 'did:plc:b',
          avatar: 42, // non-string
          handle: null, // non-string
          displayName: undefined,
        },
        { handle: 'orphan.test' }, // no did -> skipped
      ],
    });
    const out = await fetchProfilesByDid(makeApi(getProfiles), 'jwt', [
      'did:plc:a',
      'did:plc:b',
    ]);
    expect(out.size).toBe(2);
    expect(out.get('did:plc:a')).toEqual({
      avatar: 'https://cdn/a.jpg',
      handle: 'alice.test',
      displayName: 'Alice',
    });
    expect(out.get('did:plc:b')).toEqual({
      avatar: undefined,
      handle: undefined,
      displayName: undefined,
    });
  });

  it('chunks requests in batches of 25', async () => {
    const dids = Array.from({ length: 51 }, (_, i) => `did:plc:${i}`);
    const getProfiles = jest.fn().mockResolvedValue({ profiles: [] });
    await fetchProfilesByDid(makeApi(getProfiles), 'jwt', dids);
    expect(getProfiles).toHaveBeenCalledTimes(3);
    expect(getProfiles.mock.calls[2][1]).toHaveLength(1);
  });

  it('swallows errors and returns an empty map', async () => {
    const getProfiles = jest.fn().mockRejectedValue(new Error('boom'));
    const out = await fetchProfilesByDid(makeApi(getProfiles), 'jwt', ['did:plc:a']);
    expect(out.size).toBe(0);
  });
});

describe('subjectDid', () => {
  it('returns undefined for an undefined subject', () => {
    expect(subjectDid(undefined)).toBeUndefined();
  });

  it('returns a direct did when present', () => {
    expect(subjectDid({ did: 'did:plc:direct' })).toBe('did:plc:direct');
  });

  it('extracts the did from an at:// uri with a collection path', () => {
    expect(
      subjectDid({ uri: 'at://did:plc:xyz/app.bsky.feed.post/abc' }),
    ).toBe('did:plc:xyz');
  });

  it('extracts the did from an at:// uri with no trailing slash', () => {
    expect(subjectDid({ uri: 'at://did:plc:onlyrepo' })).toBe('did:plc:onlyrepo');
  });

  it('returns undefined when the uri is not an at:// uri', () => {
    expect(subjectDid({ uri: 'https://example.com/foo' })).toBeUndefined();
  });

  it('returns undefined when neither did nor a usable uri is present', () => {
    expect(subjectDid({ foo: 'bar' })).toBeUndefined();
  });

  it('prefers a direct did over a uri', () => {
    expect(
      subjectDid({ did: 'did:plc:direct', uri: 'at://did:plc:other/x/y' }),
    ).toBe('did:plc:direct');
  });
});
