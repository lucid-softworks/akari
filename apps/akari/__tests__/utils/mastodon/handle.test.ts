import { instanceHostFromUrl, toFullAcct } from '@/utils/mastodon/handle';

describe('instanceHostFromUrl', () => {
  it('strips the scheme', () => {
    expect(instanceHostFromUrl('https://mastodon.social')).toBe('mastodon.social');
    expect(instanceHostFromUrl('http://localhost:3000')).toBe('localhost:3000');
  });

  it('strips trailing slashes', () => {
    expect(instanceHostFromUrl('https://mastodon.social/')).toBe('mastodon.social');
    expect(instanceHostFromUrl('https://mastodon.social//')).toBe('mastodon.social');
  });

  it('returns undefined for missing input', () => {
    expect(instanceHostFromUrl(undefined)).toBeUndefined();
  });
});

describe('toFullAcct', () => {
  it('passes a federated acct straight through', () => {
    expect(
      toFullAcct({ acct: 'bob@fosstodon.org' }, 'https://mastodon.social'),
    ).toBe('bob@fosstodon.org');
  });

  it('appends the viewer host to a local acct', () => {
    expect(toFullAcct({ acct: 'alice' }, 'https://mastodon.social')).toBe(
      'alice@mastodon.social',
    );
  });

  it('returns undefined when both acct and host are missing', () => {
    expect(toFullAcct({ acct: 'alice' }, undefined)).toBeUndefined();
  });

  it('returns undefined when acct is empty', () => {
    expect(toFullAcct({ acct: '' }, 'https://mastodon.social')).toBeUndefined();
  });
});
