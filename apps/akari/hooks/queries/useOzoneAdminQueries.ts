import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { ozoneForAccount } from '@/utils/blueskyOzone';

/**
 * Tier-3 admin queries: safelink rules, sets, signature correlation,
 * verifications.
 */

// ---------- Safelink ----------

export function useSafelinkRules() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['ozone', 'safelink', 'rules', ozoneDid] as const,
    enabled: !!token && !!currentAccount?.pdsUrl,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.pdsUrl) return [];
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.querySafelinkRules(token, ozoneDid, { limit: 100 });
      return response.rules;
    },
  });
}

export function useAddSafelinkRule() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      url: string;
      pattern: 'domain' | 'url';
      action: 'block' | 'warn' | 'whitelist';
      reason: string;
      comment?: string;
    }) => {
      if (!token || !currentAccount?.pdsUrl) throw new Error('addSafelinkRule: missing session or PDS');
      const ozone = ozoneForAccount(currentAccount);
      return ozone.addSafelinkRule(token, ozoneDid, {
        ...input,
        createdBy: currentAccount.did,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ozone', 'safelink', 'rules'] }),
  });
}

export function useRemoveSafelinkRule() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { url: string; pattern: 'domain' | 'url'; comment?: string }) => {
      if (!token || !currentAccount?.pdsUrl) throw new Error('removeSafelinkRule: missing session or PDS');
      const ozone = ozoneForAccount(currentAccount);
      return ozone.removeSafelinkRule(token, ozoneDid, {
        ...input,
        createdBy: currentAccount.did,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ozone', 'safelink', 'rules'] }),
  });
}

// ---------- Sets ----------

export function useOzoneSets() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['ozone', 'sets', ozoneDid] as const,
    enabled: !!token && !!currentAccount?.pdsUrl,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.pdsUrl) return [];
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.listSets(token, ozoneDid, { limit: 100 });
      return response.sets;
    },
  });
}

// ---------- Verifications ----------

export function useOzoneVerifications() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['ozone', 'verifications', ozoneDid] as const,
    enabled: !!token && !!currentAccount?.pdsUrl,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.pdsUrl) return [];
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.listVerifications(token, ozoneDid, { limit: 100 });
      return response.verifications;
    },
  });
}

// ---------- Signatures ----------

export function useFindRelatedAccounts(did: string | undefined) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['ozone', 'signature', 'related', ozoneDid, did] as const,
    enabled: !!did && !!token && !!currentAccount?.pdsUrl,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!did) return [];
      if (!token || !currentAccount?.pdsUrl) return [];
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.findRelatedAccounts(token, ozoneDid, did);
      return response.accounts;
    },
  });
}
