import { Platform } from 'react-native';

/**
 * Constants for akari's Mastodon / fediverse OAuth client.
 *
 * Unlike atproto — where the auth server fetches a hosted `client_id` JSON
 * document and verifies `redirect_uri`/`scope` against it — Mastodon (and
 * Pleroma/Akkoma/GoToSocial) register the client *dynamically* per instance
 * via `POST /api/v1/apps`. That means there's no hosted metadata to match
 * and we're free to register whatever redirect URI the running build needs.
 * In practice this is simpler than atproto: localhost web "just works" in
 * dev because we register `window.location.origin` at app-registration time.
 */

/** Reverse-DNS scheme claimed by every build variant (see app.config.ts). */
const NATIVE_SCHEME = 'works.lucidsoft.akari';

/** Fallback web origin when `window` is unavailable (SSR/prerender). */
const FALLBACK_WEB_HOST = 'https://akari.lucidsoft.works';

/** Shown to the user on the instance's consent screen and in their settings. */
export const MASTODON_CLIENT_NAME = 'Akari';
export const MASTODON_CLIENT_WEBSITE = 'https://akari.lucidsoft.works';

/**
 * Space-delimited OAuth scopes. Mastodon's scope vocabulary is also
 * understood by Pleroma/Akkoma/GoToSocial. We request the full read/write
 * set now so the eventual data layer doesn't force a re-consent: `read`
 * (timelines, profiles), `write` (posting, likes, follows-as-actions),
 * `follow` (legacy follow scope some servers still gate on), and `push`
 * (web push notifications).
 */
export const MASTODON_SCOPE = 'read write follow push';

/**
 * Redirect URI the instance sends the browser back to after the grant.
 *
 * Web: the current origin so dev (localhost) and prod both work without any
 * hosted metadata. Native: the reverse-DNS scheme, captured in-process by
 * `WebBrowser.openAuthSessionAsync`.
 *
 * The exact string is registered with the instance at app-registration time
 * and must be byte-identical at token exchange, so always go through here.
 */
export function mastodonRedirectUri(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/oauth/mastodon`;
    }
    return `${FALLBACK_WEB_HOST}/oauth/mastodon`;
  }
  return `${NATIVE_SCHEME}:/oauth/mastodon`;
}
