import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OzoneTeamMember } from 'bluesky-ozone';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
import { ozoneForAccount } from '@/utils/blueskyOzone';
import { fetchProfilesByDid } from '@/utils/ozoneAvatars';

export function useOzoneTeam() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  return useQuery<OzoneTeamMember[]>({
    queryKey: queryKeys.ozone.teamMembers(ozoneDid),
    enabled: !!token && !!currentAccount?.pdsUrl && !!ozoneDid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.pdsUrl) return [];
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.listTeamMembers(token, ozoneDid, { limit: 100 });
      try {
        const api = apiForAccount(currentAccount);
        const profiles = await fetchProfilesByDid(
          api,
          token,
          response.members.map((m) => m.did),
        );
        return response.members.map((m) => {
          const profile = profiles.get(m.did);
          if (!profile) return m;
          return { ...m, profile: { ...m.profile, ...profile } };
        });
      } catch {
        return response.members;
      }
    },
  });
}

export function useAddOzoneTeamMember() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ did, role }: { did: string; role: string }) => {
      if (!token || !currentAccount?.pdsUrl) throw new Error('addMember: missing session or PDS');
      const ozone = ozoneForAccount(currentAccount);
      return ozone.addTeamMember(token, ozoneDid, { did, role });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ozone.teamMembers(ozoneDid) }),
  });
}

export function useUpdateOzoneTeamMember() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { did: string; role?: string; disabled?: boolean }) => {
      if (!token || !currentAccount?.pdsUrl) throw new Error('updateMember: missing session or PDS');
      const ozone = ozoneForAccount(currentAccount);
      return ozone.updateTeamMember(token, ozoneDid, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ozone.teamMembers(ozoneDid) }),
  });
}

export function useDeleteOzoneTeamMember() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (did: string) => {
      if (!token || !currentAccount?.pdsUrl) throw new Error('deleteMember: missing session or PDS');
      const ozone = ozoneForAccount(currentAccount);
      await ozone.deleteTeamMember(token, ozoneDid, did);
      return did;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ozone.teamMembers(ozoneDid) }),
  });
}
