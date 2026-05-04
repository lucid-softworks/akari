import { useQuery } from '@tanstack/react-query';

import { createConstellationApi } from '@/constellation-api';

const VERIFICATION_COLLECTION = 'app.bsky.graph.verification';
const VERIFICATION_PATH = '.subject';

/**
 * Query Constellation for every DID that has issued an
 * `app.bsky.graph.verification` record pointing at the given subject. The
 * appview only surfaces verifications from its trusted verifier set, so this
 * is what backs the broader "who else has vouched for this person" view.
 *
 * Returns the list of distinct verifier DIDs (no record bodies, no timestamps
 * — Constellation indexes back-references, not record contents).
 */
export function useVerifiersForDid(subjectDid: string | undefined) {
  return useQuery({
    queryKey: ['verifiersForDid', subjectDid],
    queryFn: async () => {
      if (!subjectDid) return [];
      const api = createConstellationApi();
      const response = await api.getDistinctDids({
        target: subjectDid,
        collection: VERIFICATION_COLLECTION,
        path: VERIFICATION_PATH,
      });
      return response.linking_dids;
    },
    enabled: !!subjectDid,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
