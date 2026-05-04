import { sha256 } from '@noble/hashes/sha2.js';

/**
 * PKCE (RFC 7636) primitives. Used in the atproto OAuth authorize step to
 * bind the front-channel grant to the back-channel token exchange — only
 * the client that holds `verifier` can redeem the code.
 */

/** Generate a 64-byte (high-entropy) URL-safe code verifier. */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  globalThis.crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** Compute the S256 code challenge for a verifier. */
export function codeChallengeFromVerifier(verifier: string): string {
  return base64url(sha256(new TextEncoder().encode(verifier)));
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
