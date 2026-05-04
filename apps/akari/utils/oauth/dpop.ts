import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * DPoP (RFC 9449) primitives for atproto OAuth.
 *
 * Each authenticated atproto account holds a long-lived ES256 keypair that
 * binds its access tokens. Every authenticated request to the resource server
 * carries a fresh signed proof JWT (`DPoP` header) covering the request
 * method/URI plus, on resource calls, the SHA-256 of the access token. The
 * authorization server may also issue `DPoP-Nonce` challenges that the next
 * proof must echo.
 *
 * This module is pure-JS (Hermes-friendly) and keeps the keypair material in
 * a stable hex form so callers can persist it via MMKV without needing a
 * native crypto binding.
 */

export type DpopKeypair = {
  /** 32-byte P-256 private scalar, lowercase hex. */
  privateKeyHex: string;
  /** Public key in JWK form. Embedded into every DPoP proof's header. */
  publicJwk: DpopPublicJwk;
};

export type DpopPublicJwk = {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
};

/** Generate a fresh ES256 (P-256) keypair for DPoP. */
export function generateDpopKeypair(): DpopKeypair {
  const { secretKey } = p256.keygen();
  const publicPoint = p256.getPublicKey(secretKey, false); // uncompressed: 0x04 || X || Y
  // Strip leading 0x04 tag, split 64 raw bytes into X (32) + Y (32).
  const x = publicPoint.slice(1, 33);
  const y = publicPoint.slice(33, 65);

  return {
    privateKeyHex: bytesToHex(secretKey),
    publicJwk: {
      kty: 'EC',
      crv: 'P-256',
      x: base64url(x),
      y: base64url(y),
    },
  };
}

/**
 * RFC 7638 JWK thumbprint — base64url SHA-256 over the canonical JSON form
 * of the public JWK (sorted keys, no whitespace). Used as the token's `cnf.jkt`
 * claim and for client introspection.
 */
export function dpopJwkThumbprint(jwk: DpopPublicJwk): string {
  // Canonical form per RFC 7638: lexicographic key order, exact case, no
  // extra whitespace or trailing newline.
  const canonical = `{"crv":"${jwk.crv}","kty":"${jwk.kty}","x":"${jwk.x}","y":"${jwk.y}"}`;
  return base64url(sha256(utf8(canonical)));
}

export type SignDpopProofInput = {
  keypair: DpopKeypair;
  /** HTTP method (will be uppercased). */
  htm: string;
  /** HTTP URI of the request, without query string or fragment. */
  htu: string;
  /** Issued-at timestamp in seconds. Defaults to now. */
  iat?: number;
  /** Server-issued nonce from a previous `DPoP-Nonce` response header. */
  nonce?: string;
  /** Access token to bind, when proving against a resource server. */
  accessToken?: string;
  /** Unique proof identifier. Defaults to a random 128-bit value. */
  jti?: string;
};

/**
 * Sign a DPoP proof JWT for one outbound HTTP request. Returns the compact
 * JWS form (`header.payload.signature`). Pass the result as the `DPoP`
 * request header.
 */
export function signDpopProof(input: SignDpopProofInput): string {
  const header = {
    alg: 'ES256',
    typ: 'dpop+jwt',
    jwk: input.keypair.publicJwk,
  };

  const payload: Record<string, unknown> = {
    jti: input.jti ?? randomJti(),
    htm: input.htm.toUpperCase(),
    htu: stripUrlSuffix(input.htu),
    iat: input.iat ?? Math.floor(Date.now() / 1000),
  };
  if (input.nonce) payload.nonce = input.nonce;
  if (input.accessToken) payload.ath = base64url(sha256(utf8(input.accessToken)));

  const signingInput = `${base64url(utf8(JSON.stringify(header)))}.${base64url(utf8(JSON.stringify(payload)))}`;
  // p256.sign hashes internally with SHA-256 and returns raw r||s (64 bytes),
  // which is exactly what JWS ES256 expects.
  const sigBytes = p256.sign(utf8(signingInput), hexToBytes(input.keypair.privateKeyHex), { lowS: true });
  return `${signingInput}.${base64url(sigBytes)}`;
}

// ---- internal helpers --------------------------------------------------

function stripUrlSuffix(url: string): string {
  const hashIdx = url.indexOf('#');
  const trimmedHash = hashIdx === -1 ? url : url.slice(0, hashIdx);
  const queryIdx = trimmedHash.indexOf('?');
  return queryIdx === -1 ? trimmedHash : trimmedHash.slice(0, queryIdx);
}

function randomJti(): string {
  const buf = new Uint8Array(16);
  // crypto.getRandomValues is provided by the React Native + jsdom runtimes.
  globalThis.crypto.getRandomValues(buf);
  return base64url(buf);
}

function base64url(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function bytesToHex(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; i += 1) out += b[i].toString(16).padStart(2, '0');
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('hex string must have even length');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
