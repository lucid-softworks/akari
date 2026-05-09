import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import { resolveDidToPds } from '@/utils/oauth/discovery';

/**
 * Subset of `site.standard.document` fields we render. The lexicon is
 * extensible, so unknown fields are ignored — see https://standard.site/docs.
 */
export type StandardDocument = {
  /** Publication ref (`at://...`) or canonical URL. */
  site?: string;
  title: string;
  publishedAt: string;
  path?: string;
  description?: string;
  /** Plaintext fallback for the document body. */
  textContent?: string;
  /** Open union — clients render based on `$type`. */
  content?: { $type: string } & Record<string, unknown>;
  tags?: string[];
  updatedAt?: string;
};

type GetRecordResponse<T> = {
  uri: string;
  cid: string;
  value: T;
};

async function fetchStandardDocument(did: string, rkey: string): Promise<StandardDocument> {
  const pdsUrl = await resolveDidToPds(did);
  const url = new URL(`${pdsUrl}/xrpc/com.atproto.repo.getRecord`);
  url.searchParams.set('repo', did);
  url.searchParams.set('collection', 'site.standard.document');
  url.searchParams.set('rkey', rkey);

  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`getRecord failed: ${response.status}`);
  }
  const json = (await response.json()) as GetRecordResponse<StandardDocument>;
  return json.value;
}

/**
 * Fetch a `site.standard.document` record by its `{did, rkey}` pair. The
 * record is publicly readable via the host PDS's `com.atproto.repo.getRecord`
 * endpoint — no auth needed. Resolved through the DID document so it works
 * regardless of which PDS the document is on.
 */
export function useStandardDocument(ref: { did: string; rkey: string } | null | undefined) {
  return useQuery({
    queryKey: queryKeys.standardDocument(ref?.did, ref?.rkey),
    queryFn: () => fetchStandardDocument(ref!.did, ref!.rkey),
    enabled: !!ref?.did && !!ref?.rkey,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
