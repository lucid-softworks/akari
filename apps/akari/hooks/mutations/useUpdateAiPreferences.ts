import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AiPreferenceCategory, AiPreferencesRecord } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * All categories default to opt-out for accounts that don't have a
 * `community.lexicon.preference.ai` record yet. The settings screen
 * writes this baseline record when the user first opens the page so a
 * record always exists — without it, AI/ML services that respect the
 * lexicon would interpret "no record" as "no preference set" rather
 * than as a deny, and the user's stated default (everything off) would
 * never reach the wire.
 */
export const DEFAULT_AI_PREFERENCES: Record<AiPreferenceCategory, boolean> = {
  embedding: false,
  inference: false,
  syntheticContent: false,
  training: false,
};

/**
 * Build a fully-populated AI preferences record from a (possibly
 * partial) set of changes layered on top of the existing record (or
 * defaults, when no record exists yet). Pure helper exported so the
 * settings screen can apply the same projection synchronously to the
 * React Query cache for an immediate optimistic update.
 */
export function buildAiPreferencesRecord(
  changes: Partial<Record<AiPreferenceCategory, boolean>>,
  current: AiPreferencesRecord | null,
): AiPreferencesRecord {
  const now = new Date().toISOString();
  const baseFlags: Record<AiPreferenceCategory, { allow: boolean; updatedAt: string }> = {
    embedding: current?.preferences.embedding ?? { allow: DEFAULT_AI_PREFERENCES.embedding, updatedAt: now },
    inference: current?.preferences.inference ?? { allow: DEFAULT_AI_PREFERENCES.inference, updatedAt: now },
    syntheticContent:
      current?.preferences.syntheticContent ?? { allow: DEFAULT_AI_PREFERENCES.syntheticContent, updatedAt: now },
    training: current?.preferences.training ?? { allow: DEFAULT_AI_PREFERENCES.training, updatedAt: now },
  };
  const nextFlags = { ...baseFlags };
  for (const key of Object.keys(changes) as AiPreferenceCategory[]) {
    const allow = changes[key];
    if (allow !== undefined) {
      nextFlags[key] = { allow, updatedAt: now };
    }
  }
  return {
    $type: 'community.lexicon.preference.ai',
    preferences: nextFlags,
    scope: { $type: 'community.lexicon.preference.ai#globalScope' },
    updatedAt: now,
  };
}

/**
 * Persists a complete `community.lexicon.preference.ai` record to the
 * active account's PDS at `at://<did>/community.lexicon.preference.ai/self`.
 * The record passed in *replaces* the stored one (atproto's putRecord
 * semantics — no server-side merge), so callers must pass a full
 * record. Snapshots the previous cache value before writing and rolls
 * back on error.
 */
export function useUpdateAiPreferences() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const queryClient = useQueryClient();

  const queryKey = ['aiPreferences', currentAccount?.did, currentAccount?.pdsUrl] as const;

  return useMutation({
    mutationFn: async (record: AiPreferencesRecord) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No DID available');
      const api = apiForAccount(currentAccount);
      await api.putAiPreferences(token, currentAccount.did, record);
      return record;
    },
    onMutate: async () => {
      // Snapshot for rollback. Cache update is the caller's job — the
      // settings screen flips the cache synchronously on toggle so the
      // Switch reflects the new value without waiting for the debounce
      // + network round-trip.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AiPreferencesRecord | null>(queryKey);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<AiPreferencesRecord | null>(queryKey, context.previous);
      }
    },
    onSuccess: (record) => {
      queryClient.setQueryData<AiPreferencesRecord | null>(queryKey, record);
    },
  });
}
