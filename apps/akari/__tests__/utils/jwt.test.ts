import { readJwtExpiry } from '@/utils/jwt';

function makeJwt(payload: object): string {
  // Minimal JWT — header + payload base64url-encoded; signature is opaque.
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.sig`;
}

describe('readJwtExpiry', () => {
  it('returns the exp claim as a number', () => {
    const exp = 1_700_000_000;
    expect(readJwtExpiry(makeJwt({ exp }))).toBe(exp);
  });

  it('returns null when exp is missing', () => {
    expect(readJwtExpiry(makeJwt({ sub: 'did:example' }))).toBeNull();
  });

  it('returns null when exp is not a number', () => {
    expect(readJwtExpiry(makeJwt({ exp: '1700000000' }))).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(readJwtExpiry('not-a-jwt')).toBeNull();
    expect(readJwtExpiry('only.two')).toBeNull();
    expect(readJwtExpiry('a.b.c.d')).toBeNull();
  });

  it('returns null when payload is not valid JSON', () => {
    expect(readJwtExpiry('header.bm90LWpzb24.sig')).toBeNull();
  });
});
