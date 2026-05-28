// Back-compat shim — the photo lightbox lives at `components/ui/Lightbox`
// now. Existing callers and tests can keep importing `ImageViewer` from
// here for one cycle; new code should reach for `@/components/ui/Lightbox`.
export { Lightbox as ImageViewer } from '@/components/ui/Lightbox';
export type { LightboxImage } from '@/components/ui/Lightbox';
