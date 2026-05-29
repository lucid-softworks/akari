import { sha256 } from '@noble/hashes/sha2.js';

import {
  codeChallengeFromVerifier,
  generateCodeVerifier,
} from '@/utils/oauth/pkce';

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return globalThis
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('generateCodeVerifier', () => {
  it('returns a URL-safe base64 string with no padding', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifier).not.toContain('=');
  });

  it('encodes 64 random bytes (86-char base64url, no padding)', () => {
    // 64 bytes -> ceil(64/3)*4 = 88 base64 chars, minus 2 padding '=' = 86.
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBe(86);
  });

  it('fills the buffer via crypto.getRandomValues and encodes that buffer', () => {
    const spy = jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation(<T extends ArrayBufferView | null>(arr: T): T => {
        const view = arr as unknown as Uint8Array;
        for (let i = 0; i < view.length; i += 1) view[i] = i & 0xff;
        return arr;
      });

    const verifier = generateCodeVerifier();
    const expected = base64url(Uint8Array.from({ length: 64 }, (_, i) => i & 0xff));
    expect(verifier).toBe(expected);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((spy.mock.calls[0][0] as Uint8Array).length).toBe(64);

    spy.mockRestore();
  });

  it('produces different verifiers across calls (real randomness)', () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });
});

describe('codeChallengeFromVerifier', () => {
  it('is the URL-safe base64 of SHA-256(verifier)', () => {
    const verifier = 'test-verifier-value';
    const expected = base64url(sha256(new TextEncoder().encode(verifier)));
    expect(codeChallengeFromVerifier(verifier)).toBe(expected);
  });

  it('is deterministic for the same verifier', () => {
    const verifier = generateCodeVerifier();
    expect(codeChallengeFromVerifier(verifier)).toBe(
      codeChallengeFromVerifier(verifier),
    );
  });

  it('is URL-safe and unpadded', () => {
    const challenge = codeChallengeFromVerifier('abc');
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).not.toContain('=');
    // S256 digest is 32 bytes -> 43 base64url chars.
    expect(challenge.length).toBe(43);
  });

  it('matches the RFC 7636 appendix B test vector', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(codeChallengeFromVerifier(verifier)).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
});
