import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Fallback label/tag set used when we can't read the configured one
 * (no labeler service record, network error, etc.). Matches the common
 * vocabulary used across most labelers so picker UX stays useful even
 * for misconfigured instances.
 */
const FALLBACK_LABELS = [
  'spam',
  'impersonation',
  'misinformation',
  'sexual',
  'nudity',
  'porn',
  'graphic-media',
  'rude',
  'illicit',
  'security-concern',
  'violent',
] as const;

const FALLBACK_TAGS = [
  'auto-flagged',
  'repeat-offender',
  'reviewed',
  'needs-translation',
] as const;

/**
 * The set of label values + canonical tags an Ozone instance offers.
 *
 * Labels come from the labeler service record's `policies.labelValues`
 * (so they match what the labeler is actually allowed to apply). Tags
 * don't have a single source of truth on the wire — Ozone team
 * deployments typically maintain a free-text vocabulary — so we
 * default to a small set of common ones.
 */
export function useOzoneLabelOptions() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();

  return useQuery<{ labels: string[]; tags: string[] }>({
    queryKey: queryKeys.ozone.labelOptions(ozoneDid),
    enabled: !!token && !!currentAccount?.pdsUrl && !!ozoneDid,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.pdsUrl) {
        return { labels: [...FALLBACK_LABELS], tags: [...FALLBACK_TAGS] };
      }
      try {
        const api = apiForAccount(currentAccount);
        const response = await api.getLabelerServices(token, [ozoneDid], true);
        const labels = response.views[0]?.policies?.labelValues ?? [];
        return {
          labels: labels.length > 0 ? labels : [...FALLBACK_LABELS],
          tags: [...FALLBACK_TAGS],
        };
      } catch {
        return { labels: [...FALLBACK_LABELS], tags: [...FALLBACK_TAGS] };
      }
    },
  });
}
