import { useCallback } from 'react';

import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';

export function useNotImplementedToast() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  return useCallback(() => {
    showToast({
      type: 'info',
      message: t('settings.notImplemented'),
    });
  }, [showToast, t]);
}

