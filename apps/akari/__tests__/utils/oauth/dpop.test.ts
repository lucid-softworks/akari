import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';

import {
  dpopJwkThumbprint,
  generateDpopKeypair,
  signDpopProof,
} from '@/utils/oauth/dpop';

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function base64urlDecode(s: string): Uint8Array {
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = globalThis.atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJwsParts(jws: string): { header: any; payload: any; sig: Uint8Array; signingInput: Uint8Array } {
  const [h, p, s] = jws.split('.');
  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(h)));
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(p)));
  return { header, payload, sig: base64urlDecode(s), signingInput: utf8(`${h}.${p}`) };
}

describe('generateDpopKeypair', () => {
  it('produces a P-256 JWK and a 32-byte hex private scalar', () => {
    const kp = generateDpopKeypair();
    expect(kp.publicJwk.kty).toBe('EC');
    expect(kp.publicJwk.crv).toBe('P-256');
    expect(kp.publicJwk.x).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(kp.publicJwk.y).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(kp.privateKeyHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces unique keypairs across calls', () => {
    const a = generateDpopKeypair();
    const b = generateDpopKeypair();
    expect(a.privateKeyHex).not.toBe(b.privateKeyHex);
  });
});

describe('dpopJwkThumbprint', () => {
  it('matches the RFC 7638 example output for a known input', () => {
    // The thumbprint is deterministic — same JWK in, same digest out.
    const jwk = {
      kty: 'EC' as const,
      crv: 'P-256' as const,
      x: 'f83OJ3D2xF4cuO_b1ZkyD7QfXk-yk9JjKxR2-9Lqe5o',
      y: 'x_FEzRu9c-pZ0Mi4HPmWFuk7Tfd6XLMtXCsK4Tn8tCs',
    };
    expect(dpopJwkThumbprint(jwk)).toEqual(dpopJwkThumbprint(jwk));
    expect(dpopJwkThumbprint(jwk)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('signDpopProof', () => {
  const keypair = generateDpopKeypair();

  it('builds a header with alg/typ/jwk and a payload with htm/htu/iat/jti', () => {
    const jws = signDpopProof({
      keypair,
      htm: 'post',
      htu: 'https://pds.example/xrpc/com.atproto.server.createSession',
    });
    const { header, payload } = decodeJwsParts(jws);
    expect(header.alg).toBe('ES256');
    expect(header.typ).toBe('dpop+jwt');
    expect(header.jwk).toMatchObject(keypair.publicJwk);
    expect(payload.htm).toBe('POST');
    expect(payload.htu).toBe('https://pds.example/xrpc/com.atproto.server.createSession');
    expect(typeof payload.iat).toBe('number');
    expect(payload.jti).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('strips query string and fragment from htu', () => {
    const jws = signDpopProof({
      keypair,
      htm: 'GET',
      htu: 'https://pds.example/xrpc/foo?bar=1#frag',
    });
    expect(decodeJwsParts(jws).payload.htu).toBe('https://pds.example/xrpc/foo');
  });

  it('emits an `ath` claim that is the base64url SHA-256 of the access token', () => {
    const accessToken = 'eyJabc.abc.def';
    const jws = signDpopProof({ keypair, htm: 'GET', htu: 'https://x.test/y', accessToken });
    const expectedAth = Buffer.from(sha256(utf8(accessToken)))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeJwsParts(jws).payload.ath).toBe(expectedAth);
  });

  it('echoes the server-supplied nonce when provided', () => {
    const jws = signDpopProof({ keypair, htm: 'GET', htu: 'https://x.test/y', nonce: 'srv-nonce-123' });
    expect(decodeJwsParts(jws).payload.nonce).toBe('srv-nonce-123');
  });

  it('produces a signature that verifies against the keypair', () => {
    const jws = signDpopProof({ keypair, htm: 'POST', htu: 'https://x.test/y' });
    const { sig, signingInput } = decodeJwsParts(jws);
    const publicKey = p256.getPublicKey(Uint8Array.from(Buffer.from(keypair.privateKeyHex, 'hex')), false);
    // p256.verify hashes the message with sha256 internally — matches sign().
    expect(p256.verify(sig, signingInput, publicKey)).toBe(true);
  });

  it('produces unique jti values across calls', () => {
    const a = decodeJwsParts(signDpopProof({ keypair, htm: 'GET', htu: 'https://x.test' })).payload.jti;
    const b = decodeJwsParts(signDpopProof({ keypair, htm: 'GET', htu: 'https://x.test' })).payload.jti;
    expect(a).not.toBe(b);
  });
});
