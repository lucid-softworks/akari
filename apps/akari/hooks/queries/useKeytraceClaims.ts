import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyApi } from '@/bluesky-api';

type KeytraceClaimRecord = {
  type: string;
  claimUri: string;
  identity: {
    subject: string;
    avatarUrl?: string;
    profileUrl?: string;
    displayName?: string;
  };
  status?: string;
};

type KeytraceClaim = {
  rkey: string;
  type: string;
  claimUri: string;
  identity: KeytraceClaimRecord['identity'];
};

export function useKeytraceClaims(handle?: string) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['keytrace', handle],
    queryFn: async (): Promise<KeytraceClaim[]> => {
      if (!handle || !token || !currentAccount?.pdsUrl) return [];

      // Resolve handle to DID
      const api = new BlueskyApi(currentAccount.pdsUrl);
      let did: string;
      try {
        const resolution = await api.resolveHandle(token, handle);
        did = resolution.did;
      } catch {
        return [];
      }

      // Fetch claim records directly from the user's PDS
      try {
        const pdsUrl = await resolvePds(did);
        const response = await fetch(
          `${pdsUrl}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=dev.keytrace.claim&limit=50`,
        );

        if (!response.ok) return [];

        const data = await response.json();
        const records = data.records ?? [];

        return records
          .filter((r: any) => r.value?.identity?.subject)
          .map((r: any) => ({
            rkey: r.uri.split('/').pop(),
            type: r.value.type,
            claimUri: r.value.claimUri,
            identity: r.value.identity,
          }));
      } catch {
        return [];
      }
    },
    enabled: !!(handle && token && currentAccount?.pdsUrl),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

async function resolvePds(did: string): Promise<string> {
  // For did:plc, resolve via plc.directory
  if (did.startsWith('did:plc:')) {
    const response = await fetch(`https://plc.directory/${did}`);
    if (!response.ok) throw new Error('Failed to resolve DID');
    const doc = await response.json();
    const pdsService = doc.service?.find((s: any) => s.id === '#atproto_pds');
    if (!pdsService?.serviceEndpoint) throw new Error('No PDS found');
    return pdsService.serviceEndpoint;
  }
  // For did:web, resolve via .well-known
  const host = did.replace('did:web:', '');
  const response = await fetch(`https://${host}/.well-known/did.json`);
  if (!response.ok) throw new Error('Failed to resolve DID');
  const doc = await response.json();
  const pdsService = doc.service?.find((s: any) => s.id === '#atproto_pds');
  if (!pdsService?.serviceEndpoint) throw new Error('No PDS found');
  return pdsService.serviceEndpoint;
}
