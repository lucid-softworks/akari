/**
 * Decode the `exp` claim out of a JWT's payload. Does not verify the
 * signature — we only use this on tokens the server already issued to us,
 * to decide locally when to refresh ahead of expiry.
 *
 * Returns Unix-seconds or `null` for malformed input / missing `exp`. A null
 * return tells the caller "I can't tell when this expires; assume it's
 * stale" rather than "valid forever".
 */
export function readJwtExpiry(jwt: string): number | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecodeToString(parts[1])) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function base64UrlDecodeToString(input: string): string {
  // Restore standard base64 alphabet + padding so atob accepts it.
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return globalThis.atob(padded + '='.repeat(padLength));
}
