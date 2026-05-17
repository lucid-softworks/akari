import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewSettings } from '@/hooks/useAppViewSettings';
import { resolveAppView } from '@/utils/appView';

const TYPEAHEAD_LIMIT = 8;
const DEBOUNCE_MS = 250;

export type TypeaheadActor = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
};

/**
 * Debounced wrapper around `app.bsky.actor.searchActorsTypeahead` against the
 * public appview. Used by the OAuth sign-in screen to suggest matching
 * handles as the user types — helpful when the user can't remember whether
 * their handle is `alice.bsky.social` vs `alice.example.com` vs an alias.
 *
 * Anonymous endpoint (no auth header), so we can call it from the
 * unauthenticated sign-in flow.
 */
export function useTypeaheadActors(rawQuery: string): {
  data: TypeaheadActor[];
  isLoading: boolean;
} {
  const trimmed = rawQuery.replace(/^@/, '').trim();
  const [debounced, setDebounced] = useState(trimmed);
  const { config } = useAppViewSettings();
  const appViewUrl = resolveAppView(config).url;

  useEffect(() => {
    // Below-threshold inputs flush immediately so the dropdown clears
    // without waiting for the debounce; otherwise delay the commit so we
    // don't fire one XRPC call per keystroke.
    const delay = trimmed.length < 2 ? 0 : DEBOUNCE_MS;
    const t = setTimeout(() => setDebounced(trimmed), delay);
    return () => clearTimeout(t);
  }, [trimmed]);

  const query = useQuery({
    queryKey: queryKeys.typeaheadActors(debounced, appViewUrl),
    queryFn: async (): Promise<TypeaheadActor[]> => {
      const url = new URL(`${appViewUrl}/xrpc/app.bsky.actor.searchActorsTypeahead`);
      url.searchParams.set('q', debounced);
      url.searchParams.set('limit', String(TYPEAHEAD_LIMIT));
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const json = (await res.json()) as { actors?: TypeaheadActor[] };
      return json.actors ?? [];
    },
    enabled: debounced.length >= 2,
    staleTime: 30 * 1000,
    // Keep showing the prior matches while the next query is in flight so the
    // suggestion list doesn't blink empty (and shift layout) on every keystroke.
    placeholderData: keepPreviousData,
  });

  // When the query is disabled (input too short or empty), the kept-previous
  // data would still be returned — so the dropdown would linger after the user
  // clears the box. Drop the cached results in that case.
  const active = trimmed.length >= 2;

  return {
    data: active ? (query.data ?? []) : [],
    isLoading: active && query.isFetching,
  };
}
