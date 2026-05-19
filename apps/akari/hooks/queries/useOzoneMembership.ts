import { useQuery } from '@tanstack/react-query';
import { OZONE_MOD_ROLES, type OzoneTeamMember } from 'bluesky-ozone';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { ozoneForAccount } from '@/utils/blueskyOzone';

const MOD_ROLE_SET = new Set<string>(OZONE_MOD_ROLES);

export type OzoneMembership = {
  isMod: boolean;
  role: string | undefined;
  self: OzoneTeamMember | undefined;
};

/**
 * Resolves whether the signed-in account is a member of the configured
 * Ozone team. Used to gate the moderation tab + sidebar entry.
 *
 * Calls `tools.ozone.team.listMembers` filtered to the viewer's DID via
 * the `q` parameter so we don't pull the whole team just to answer
 * "am I in this list?".
 */
export function useOzoneMembership(ozoneDidOverride?: string) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const settingDid = useOzoneDid();
  const ozoneDid = ozoneDidOverride ?? settingDid;

  return useQuery<OzoneMembership>({
    queryKey: queryKeys.ozone.membership(ozoneDid, currentAccount?.did),
    enabled: !!token && !!currentAccount?.did && !!currentAccount.pdsUrl && !!ozoneDid,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.did || !currentAccount.pdsUrl) {
        return { isMod: false, role: undefined, self: undefined };
      }
      const client = ozoneForAccount(currentAccount);
      const response = await client.listTeamMembers(token, ozoneDid, {
        q: currentAccount.did,
        limit: 25,
      });
      const self = response.members.find((m) => m.did === currentAccount.did);
      return {
        isMod: !!self && MOD_ROLE_SET.has(self.role) && self.disabled !== true,
        role: self?.role,
        self,
      };
    },
  });
}
