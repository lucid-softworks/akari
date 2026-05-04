/**
 * Constants for the akari atproto OAuth client.
 *
 * The values must match what's served at `client_id` (the hosted JSON
 * metadata document) — auth servers fetch that document and verify the
 * incoming request's `client_id`, `redirect_uri`, and `scope` against it.
 *
 * For now these are prod-only; the development / preview TestFlight builds
 * keep using app-password auth until per-variant client metadata is hosted.
 */
export const OAUTH_CLIENT_ID = 'https://akari.lucidsoft.works/.well-known/oauth-client.json';
export const OAUTH_REDIRECT_URI = 'works.lucidsoft.akari:/oauth/callback';
export const OAUTH_SCOPE = 'atproto transition:generic transition:chat.bsky';
