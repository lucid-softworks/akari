import { Linking } from 'react-native';

/**
 * Centralised gateway for opening URLs that point outside akari. Renders a
 * confirmation modal so users don't get sent off-site without a heads-up.
 *
 * Usage pattern:
 *   1. `<ExternalLinkConfirmHost />` mounted once at the app root subscribes
 *      to incoming open requests via `registerExternalLinkConfirm`.
 *   2. Anywhere in the tree, call `openExternalLink(url)`. If a host is
 *      registered, the user sees the modal; otherwise we fall straight
 *      through to `Linking.openURL` (so the helper still works in tests or
 *      before the host mounts).
 *
 * Kept as a module-level singleton rather than React context to keep the
 * 15+ callsites that already use `Linking.openURL` from having to thread
 * a context through every component. The host is mounted exactly once.
 */

export type ExternalLinkConfirmRequest = {
  url: string;
  resolve: (open: boolean) => void;
};

type Listener = (request: ExternalLinkConfirmRequest) => void;

let listener: Listener | null = null;

export function registerExternalLinkConfirm(next: Listener | null): void {
  listener = next;
}

/**
 * Returns `true` when the URL targets a non-internal site that should
 * trigger the confirmation dialog. Anything that isn't http/https (mailto:,
 * tel:, bsky.app deep links handled by expo-router, etc.) skips the prompt
 * so the user isn't asked to confirm opening their own mail client.
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed);
}

/**
 * Open an external URL after the user confirms. Resolves once the URL has
 * either been opened or the user cancelled.
 */
export async function openExternalLink(url: string): Promise<void> {
  if (!isExternalUrl(url)) {
    // Non-http schemes go straight through — these are usually intent-style
    // links (mailto, tel) where the OS shows its own picker, so adding our
    // own modal on top would be one prompt too many.
    await Linking.openURL(url);
    return;
  }

  if (!listener) {
    // Host not mounted yet (or never mounted, eg. tests). Fall through to
    // the raw open so we don't silently swallow the click.
    await Linking.openURL(url);
    return;
  }

  const confirmed = await new Promise<boolean>((resolve) => {
    listener!({ url, resolve });
  });
  if (confirmed) {
    await Linking.openURL(url);
  }
}
