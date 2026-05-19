import { useQuery } from '@tanstack/react-query';

import { resolveDidToPds } from '@/utils/oauth/discovery';
import {
  parseSkyblurUrl,
  skyblurTextOf,
  type SkyblurRecordValue,
} from '@/utils/skyblur';

/**
 * Fetches the original text of a Skyblur post given its external-embed
 * URL (e.g. `https://skyblur.uk/post/<did>/<rkey>`). Resolves the
 * author's PDS via plc.directory / DID-web, then calls
 * `com.atproto.repo.getRecord` on the `uk.skyblur.post` collection.
 *
 * Returns `null` when the URL doesn't look like a Skyblur post — callers
 * can fall back to the normal masked post body in that case.
 *
 * Public endpoint: no auth required. Cached for 24h since Skyblur
 * records are effectively immutable once published.
 */
export function useSkyblurPost(externalUrl: string | undefined | null) {
  const ref = parseSkyblurUrl(externalUrl ?? undefined);
  return useQuery({
    queryKey: ['skyblur', ref?.uri],
    enabled: !!ref,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      if (!ref) return null;
      const pds = await resolveDidToPds(ref.did);
      const url =
        `${pds}/xrpc/com.atproto.repo.getRecord` +
        `?repo=${encodeURIComponent(ref.did)}` +
        `&collection=uk.skyblur.post` +
        `&rkey=${encodeURIComponent(ref.rkey)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        // Surface as a thrown error so React Query enters the error
        // state — the consumer falls back to the masked post body.
        throw new Error(`Skyblur fetch failed: ${res.status}`);
      }
      const body = (await res.json()) as {
        uri?: string;
        cid?: string;
        value?: SkyblurRecordValue;
      };
      return {
        uri: body.uri ?? ref.uri,
        cid: body.cid,
        text: skyblurTextOf(body.value),
        additional:
          typeof body.value?.additional === 'string' && body.value.additional.length > 0
            ? body.value.additional
            : undefined,
        visibility: body.value?.visibility,
      };
    },
  });
}
