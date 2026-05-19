import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useOzoneDid } from '@/hooks/useOzoneSettings';
import { queryKeys } from '@/hooks/queryKeys';
import { ozoneForAccount } from '@/utils/blueskyOzone';

export function useCreateOzoneTemplate() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      contentMarkdown: string;
      subject?: string;
      lang?: string;
    }) => {
      if (!token || !currentAccount?.pdsUrl) {
        throw new Error('createTemplate: missing session or PDS');
      }
      const ozone = ozoneForAccount(currentAccount);
      return ozone.createCommTemplate(token, ozoneDid, {
        ...input,
        createdBy: currentAccount.did,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ozone.templates(ozoneDid) });
    },
  });
}

export function useUpdateOzoneTemplate() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      contentMarkdown?: string;
      subject?: string;
      lang?: string;
      disabled?: boolean;
    }) => {
      if (!token || !currentAccount?.pdsUrl) {
        throw new Error('updateTemplate: missing session or PDS');
      }
      const ozone = ozoneForAccount(currentAccount);
      return ozone.updateCommTemplate(token, ozoneDid, {
        ...input,
        updatedBy: currentAccount.did,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ozone.templates(ozoneDid) });
    },
  });
}

export function useDeleteOzoneTemplate() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const ozoneDid = useOzoneDid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!token || !currentAccount?.pdsUrl) {
        throw new Error('deleteTemplate: missing session or PDS');
      }
      const ozone = ozoneForAccount(currentAccount);
      await ozone.deleteCommTemplate(token, ozoneDid, id);
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ozone.templates(ozoneDid) });
    },
  });
}
