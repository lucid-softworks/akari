import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

import type { SearchSort, SearchTabType } from '@/components/search/SearchListHeader';

const isHashtagQuery = (value: string) => value.trim().startsWith('#');

// The deep-linked `?query=` param seeds four pieces of form state on
// first mount and whenever the URL param flips to a new value. Holding
// them in a single bag lets the URL sync effect commit atomically
// (one render, not four) instead of cascading setState calls.
type SearchForm = {
  query: string;
  searchQuery: string;
  activeTab: SearchTabType;
  sort: SearchSort;
};

const buildInitialForm = (raw: string | undefined, guest: boolean): SearchForm => {
  const initial = raw ?? '';
  const isHashtag = initial && isHashtagQuery(initial);
  // Guests don't see the "All" tab (it'd collapse to Users since
  // post search is auth-gated), so default them to "users". Hashtag
  // searches still go to "posts" — the empty state on that tab
  // shows the sign-in CTA.
  const defaultTab: SearchTabType = isHashtag ? 'posts' : guest ? 'users' : 'all';
  return {
    query: initial,
    searchQuery: initial,
    activeTab: defaultTab,
    sort: 'top',
  };
};

/**
 * Owns the search screen's form state (input value, committed query,
 * active tab, sort) plus the effects that keep it in sync with the
 * route's `?query=` param and the guest auth state.
 */
export function useSearchForm(initialQuery: string | undefined, isGuest: boolean) {
  const [form, setForm] = useState<SearchForm>(() => buildInitialForm(initialQuery, isGuest));
  const { query, searchQuery, activeTab, sort } = form;

  const setQuery = useCallback((next: string) => setForm((p) => ({ ...p, query: next })), []);
  const setSearchQuery = useCallback(
    (next: string) => setForm((p) => ({ ...p, searchQuery: next })),
    [],
  );
  const setActiveTab = useCallback(
    (next: SearchTabType) => setForm((p) => ({ ...p, activeTab: next })),
    [],
  );
  const setSort = useCallback((next: SearchSort) => setForm((p) => ({ ...p, sort: next })), []);

  useEffect(() => {
    if (initialQuery === undefined || initialQuery === searchQuery) {
      return;
    }
    setForm((prev) => {
      const isHashtag = isHashtagQuery(initialQuery);
      return {
        query: initialQuery,
        searchQuery: initialQuery,
        activeTab: isHashtag ? 'posts' : prev.activeTab,
        sort: isHashtag ? 'top' : prev.sort,
      };
    });
  }, [initialQuery, searchQuery]);

  // Mirror the committed search term into the route's `?query=` param so
  // that navigating to a result and coming back via the browser/back
  // button restores the search instead of dropping into an empty
  // state. `router.setParams` updates the URL in place — no new
  // history entry — and the effect above already short-circuits when
  // `initialQuery === searchQuery`, so this won't loop.
  useEffect(() => {
    const next = searchQuery.trim();
    const current = (initialQuery ?? '').trim();
    if (next === current) return;
    router.setParams({ query: next.length > 0 ? next : undefined });
  }, [searchQuery, initialQuery]);

  // If the user signs out mid-session while parked on the "All" tab,
  // SearchTabs drops that entry — leaving the bar with no visibly
  // selected tab. Slide them down to "Users", which is the closest
  // equivalent (post search is auth-gated for guests anyway).
  useEffect(() => {
    if (isGuest && activeTab === 'all') {
      setActiveTab('users');
    }
  }, [isGuest, activeTab, setActiveTab]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      setSearchQuery(query.trim());
      Keyboard.dismiss();
    }
  }, [query, setSearchQuery]);

  const handleClearQuery = useCallback(() => {
    setQuery('');
    setSearchQuery('');
  }, [setQuery, setSearchQuery]);

  return {
    query,
    searchQuery,
    activeTab,
    sort,
    setQuery,
    setSearchQuery,
    setActiveTab,
    setSort,
    handleSearch,
    handleClearQuery,
  };
}
