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

type UseOzoneMembershipOptions = {
  ozoneDidOverride?: string;
  /**
   * When false, the underlying `listMembers` request is suppressed. The
   * sidebar opts out unless the user has the moderation tab enabled so
   * we don't fire an Ozone request just to ask "should I render the
   * moderation link?". Moderation pages always leave this on.
   */
  enabled?: boolean;
};

/**
 * Resolves whether the signed-in account is a member of the configured
 * Ozone team. Used to gate the moderation tab + sidebar entry.
 *
 * Calls `tools.ozone.team.listMembers` filtered to the viewer's DID via
 * the `q` parameter so we don't pull the whole team just to answer
 * "am I in this list?".
 */
export function useOzoneMembership(options: UseOzoneMembershipOptions = {}) {
  const { ozoneDidOverride, enabled = true } = options;
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const settingDid = useOzoneDid();
  const ozoneDid = ozoneDidOverride ?? settingDid;

  return useQuery<OzoneMembership>({
    queryKey: queryKeys.ozone.membership(ozoneDid, currentAccount?.did),
    enabled: enabled && !!token && !!currentAccount?.did && !!currentAccount.pdsUrl && !!ozoneDid,
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
