import { type DpopKeypair, signDpopProof } from './dpop';

/**
 * POST to a DPoP-protected endpoint with form-encoded body, transparently
 * handling the `use_dpop_nonce` retry handshake.
 *
 * The authorization server may respond 400/401 with `DPoP-Nonce: <value>`
 * and `error=use_dpop_nonce`, telling the client to re-sign the proof
 * including that nonce. We retry once with the supplied nonce; on a second
 * `use_dpop_nonce`, we surface the error rather than spinning forever.
 *
 * Returns:
 *   - response — the final fetch Response (after retry, if any)
 *   - body — already-parsed JSON body, or `null` if the response had no body
 *   - nonce — the most recent `DPoP-Nonce` server value, useful to feed
 *     back into a follow-up call without doing another preflight.
 */
export type DpopFetchResult<T> = {
  response: Response;
  body: T | null;
  nonce?: string;
};

export async function dpopFetch<T = unknown>(
  url: string,
  init: {
    method: 'POST' | 'GET';
    body?: Record<string, string>;
    keypair: DpopKeypair;
    accessToken?: string;
    nonce?: string;
    headers?: Record<string, string>;
  },
): Promise<DpopFetchResult<T>> {
  const send = async (nonce: string | undefined): Promise<Response> => {
    const proof = signDpopProof({
      keypair: init.keypair,
      htm: init.method,
      htu: url,
      nonce,
      accessToken: init.accessToken,
    });
    const headers: Record<string, string> = {
      DPoP: proof,
      Accept: 'application/json',
      ...init.headers,
    };
    let body: string | undefined;
    if (init.body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(init.body).toString();
    }
    if (init.accessToken) {
      headers.Authorization = `DPoP ${init.accessToken}`;
    }
    return fetch(url, { method: init.method, headers, body });
  };

  let response = await send(init.nonce);
  let serverNonce = response.headers.get('DPoP-Nonce') ?? undefined;

  // If the server demanded a nonce we didn't have, retry once with the one
  // we just got.
  if (!response.ok && serverNonce && (await isUseDpopNonce(response))) {
    response = await send(serverNonce);
    serverNonce = response.headers.get('DPoP-Nonce') ?? serverNonce;
  }

  let body: T | null = null;
  // Some endpoints return 204 No Content; only parse JSON when there's a body.
  if (response.status !== 204) {
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text) as T;
      } catch {
        // Caller can decide what to do with a non-JSON error body.
        body = null;
      }
    }
  }

  return { response, body, nonce: serverNonce };
}

async function isUseDpopNonce(response: Response): Promise<boolean> {
  try {
    const cloned = response.clone();
    const text = await cloned.text();
    if (!text) return false;
    const json = JSON.parse(text) as { error?: string };
    return json.error === 'use_dpop_nonce';
  } catch {
    return false;
  }
}
