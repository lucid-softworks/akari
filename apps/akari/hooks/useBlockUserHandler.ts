import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

type HandleBlockPressParams = {
  did?: string;
  handle: string;
  blockingUri?: string;
  onSuccess?: () => void;
};

export function useBlockUserHandler() {
  const queryClient = useQueryClient();
  const blockMutation = useBlockUser();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleBlockPress = useCallback(
    ({ did, handle, blockingUri, onSuccess }: HandleBlockPressParams) => {
      if (!did) {
        return;
      }

      const isBlocking = Boolean(blockingUri);
      const action = isBlocking ? 'unblock' : 'block';
      const titleKey = isBlocking ? 'common.unblock' : 'common.block';
      const messageKey = isBlocking ? 'profile.unblockConfirmation' : 'profile.blockConfirmation';

      const runMutation = async () => {
        try {
          await blockMutation.mutateAsync({
            did,
            blockUri: blockingUri,
            action,
          });

          if (handle) {
            queryClient.invalidateQueries({ queryKey: ['profile', handle] });
          }

          queryClient.invalidateQueries({ queryKey: ['profile', did] });
          onSuccess?.();
        } catch (error) {
          console.error('Block error:', error);
          showToast({
            type: 'error',
            title: t(titleKey),
            message: t('common.somethingWentWrong'),
          });
        }
      };

      showAlert({
        title: t(titleKey),
        message: t(messageKey, { handle }),
        buttons: [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t(titleKey),
            style: 'destructive',
            onPress: runMutation,
          },
        ],
      });
    },
    [blockMutation, queryClient, showToast, t],
  );

  return {
    handleBlockPress,
  };
}

