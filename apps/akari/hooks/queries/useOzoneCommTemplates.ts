import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { ozoneForAccount } from '@/utils/blueskyOzone';

export type OzoneCommTemplate = {
  id: string;
  name: string;
  subject?: string;
  contentMarkdown?: string;
  lang?: string;
  disabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Communication templates an Ozone team has authored, for the email action. */
export function useOzoneCommTemplates() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();

  return useQuery<OzoneCommTemplate[]>({
    queryKey: queryKeys.ozone.templates(ozoneDid),
    enabled: !!token && !!currentAccount?.pdsUrl && !!ozoneDid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.pdsUrl) return [];
      const ozone = ozoneForAccount(currentAccount);
      const response = await ozone.listCommTemplates(token, ozoneDid);
      return response.communicationTemplates as OzoneCommTemplate[];
    },
  });
}
