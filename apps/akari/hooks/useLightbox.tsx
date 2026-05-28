import { useCallback } from 'react';

import { Lightbox, type LightboxImage } from '@/components/ui/Lightbox';
import { useDialogManager } from '@/contexts/DialogContext';

let lightboxCounter = 0;

/**
 * Opens the photo {@link Lightbox} through the central dialog manager rather
 * than each caller juggling its own `visible` state + inline render. Mounting
 * it at the provider level also lifts it out of any virtualized-list /
 * sticky-header stacking context it was triggered from.
 *
 * Returns `open(images, startIndex?)`; a no-op when `images` is empty.
 */
export function useLightbox() {
  const dialogManager = useDialogManager();

  return useCallback(
    (images: LightboxImage[], startIndex: number = 0) => {
      if (images.length === 0) return;
      const id = `lightbox-${lightboxCounter++}`;
      dialogManager.open({
        id,
        component: (
          <Lightbox
            visible
            images={images}
            startIndex={startIndex}
            onClose={() => dialogManager.close(id)}
          />
        ),
      });
    },
    [dialogManager],
  );
}
