/**
 * atproto OAuth discovery: handle → DID → PDS → authorization server metadata.
 *
 * The flow is:
 *   1. Resolve the user-supplied handle to a DID (via the public app-view).
 *   2. Resolve the DID to a PDS service URL (via the DID document).
 *   3. Fetch `/.well-known/oauth-protected-resource` from the PDS to learn
 *      its authorization server (`authorization_servers[0]`).
 *   4. Fetch `/.well-known/oauth-authorization-server` from that server to
 *      get the authorization, token, and PAR endpoints, plus supported
 *      DPoP signing algorithms.
 *
 * Each step does a single GET; no auth required.
 */

import { readAppViewSettings } from '@/hooks/useAppViewSettings';
import { resolveAppView } from '@/utils/appView';

const PLC_DIRECTORY = 'https://plc.directory';

/**
 * Snapshot the configured public AppView at call time so the pre-auth flow
 * (resolveHandle → DID) honours the user's AppView pick. Pre-auth means we
 * have no PDS to proxy through, so we hit the AppView's HTTPS base directly.
 */
function publicAppViewUrl(): string {
  return resolveAppView(readAppViewSettings()).url;
}

export type AuthorizationServerMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  pushed_authorization_request_endpoint: string;
  dpop_signing_alg_values_supported?: string[];
  scopes_supported?: string[];
  require_pushed_authorization_requests?: boolean;
};

export type ResolvedIdentity = {
  did: string;
  handle: string;
  pdsUrl: string;
};

/**
 * Resolve `handle` (without leading @) to a DID via the public appview's
 * `com.atproto.identity.resolveHandle`. Throws on a malformed handle or
 * unknown account.
 */
export async function resolveHandleToDid(handle: string): Promise<string> {
  const cleaned = handle.replace(/^@/, '').trim();
  const url = new URL(`${publicAppViewUrl()}/xrpc/com.atproto.identity.resolveHandle`);
  url.searchParams.set('handle', cleaned);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`resolveHandle failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { did?: string };
  if (!json.did) throw new Error('resolveHandle returned no did');
  return json.did;
}

/**
 * Resolve a DID to its PDS service URL by fetching the DID document.
 * Supports `did:plc:*` (via plc.directory) and `did:web:*`.
 */
export async function resolveDidToPds(did: string): Promise<string> {
  let docUrl: string;
  if (did.startsWith('did:plc:')) {
    docUrl = `${PLC_DIRECTORY}/${did}`;
  } else if (did.startsWith('did:web:')) {
    const host = did.slice('did:web:'.length).replace(/:/g, '/');
    docUrl = `https://${host}/.well-known/did.json`;
  } else {
    throw new Error(`Unsupported DID method: ${did}`);
  }

  const res = await fetch(docUrl, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`DID document fetch failed: ${res.status}`);
  const doc = (await res.json()) as {
    service?: { id: string; type: string; serviceEndpoint: string }[];
  };

  const pdsService = doc.service?.find(
    (s) => s.type === 'AtprotoPersonalDataServer' || s.id.endsWith('#atproto_pds'),
  );
  if (!pdsService?.serviceEndpoint) {
    throw new Error('DID document has no AtprotoPersonalDataServer service');
  }
  return pdsService.serviceEndpoint.replace(/\/$/, '');
}

/**
 * Convenience: resolve a user-supplied handle through to its DID + PDS in
 * one call. Throws if the handle is unknown or the DID document is missing
 * a PDS service.
 */
export async function resolveIdentity(handle: string): Promise<ResolvedIdentity> {
  const did = await resolveHandleToDid(handle);
  const pdsUrl = await resolveDidToPds(did);
  return { did, handle: handle.replace(/^@/, '').trim(), pdsUrl };
}

/**
 * Fetch the OAuth authorization server metadata that protects a given PDS.
 * Two-step: ask the PDS who its authorization server is, then ask the
 * authorization server for its endpoint URLs.
 */
export async function getAuthorizationServer(pdsUrl: string): Promise<AuthorizationServerMetadata> {
  const protectedRes = await fetch(`${pdsUrl}/.well-known/oauth-protected-resource`, {
    headers: { Accept: 'application/json' },
  });
  if (!protectedRes.ok) {
    throw new Error(`oauth-protected-resource fetch failed: ${protectedRes.status}`);
  }
  const protectedJson = (await protectedRes.json()) as { authorization_servers?: string[] };
  const authServer = protectedJson.authorization_servers?.[0];
  if (!authServer) {
    throw new Error('PDS did not advertise an authorization_servers entry');
  }

  const metaUrl = `${authServer.replace(/\/$/, '')}/.well-known/oauth-authorization-server`;
  const metaRes = await fetch(metaUrl, { headers: { Accept: 'application/json' } });
  if (!metaRes.ok) {
    throw new Error(`oauth-authorization-server fetch failed: ${metaRes.status}`);
  }
  const meta = (await metaRes.json()) as AuthorizationServerMetadata;

  for (const required of ['authorization_endpoint', 'token_endpoint', 'pushed_authorization_request_endpoint'] as const) {
    if (!meta[required]) {
      throw new Error(`authorization server metadata missing ${required}`);
    }
  }

  return meta;
}
