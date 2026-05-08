import { useCallback } from 'react';

import { ConfirmDialog, type ConfirmButton } from '@/components/ui/ConfirmDialog';
import { useDialogManager } from '@/contexts/DialogContext';

let confirmCounter = 0;

type ConfirmOptions = {
  title: string;
  message?: string;
  buttons: ConfirmButton[];
};

/**
 * Drop-in styled replacement for the `showAlert` util. Renders a themed
 * `ConfirmDialog` via the global dialog manager so the chrome matches
 * the rest of the app's modals (rather than falling back to the native
 * browser `window.confirm` on web). Same API shape as `showAlert` so
 * call sites can swap in place.
 */
export function useConfirm() {
  const dialogManager = useDialogManager();

  return useCallback(
    ({ title, message, buttons }: ConfirmOptions) => {
      const id = `confirm-${++confirmCounter}`;
      const close = () => dialogManager.close(id);
      dialogManager.open({
        id,
        component: (
          <ConfirmDialog title={title} message={message} buttons={buttons} onClose={close} />
        ),
      });
    },
    [dialogManager],
  );
}
