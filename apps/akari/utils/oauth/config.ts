import { Platform } from 'react-native';

import {
  buildFullScopeString,
  flatScopes as flatScopesData,
  repoScopes as repoScopesData,
  // The .js source has full type info via JSDoc; re-declare typed views here
  // so the rest of the app gets proper TS narrowing.
} from '@/scripts/lib/oauth-scope-data';

/**
 * Constants for the akari atproto OAuth client.
 *
 * The values must match what's served at the `client_id` URL — the auth
 * server fetches that JSON document and verifies the incoming request's
 * `client_id`, `redirect_uri`, and `scope` against it. We host two docs
 * per origin:
 *
 *   /.well-known/oauth-client.json      — `application_type: "native"`,
 *                                          custom-scheme redirect for
 *                                          iOS/Android.
 *   /.well-known/oauth-client-web.json  — `application_type: "web"`,
 *                                          HTTPS redirect for the SPA.
 *
 * OAuth doesn't allow mixing those redirect styles in one client, so we
 * keep them as siblings. Templates for both, per build variant, live in
 * `apps/akari/oauth-clients/`. The `scope` field on those JSON docs is
 * generated at deploy time by `scripts/sync-oauth-meta.js` from the same
 * catalog this module imports — keeping registered scope and requested
 * scope in lock-step.
 */

// atproto OAuth requires the native redirect scheme to be the
// reverse-DNS of the client_id host, so every variant must use the
// same scheme regardless of bundle id. The dev/preview variants
// register this scheme as an extra deep-link entry in app.config.ts
// so the OS can still route the redirect to the running app.
const host = 'https://akari.lucidsoft.works';
const nativeScheme = 'works.lucidsoft.akari';

export const OAUTH_CLIENT_ID =
  Platform.OS === 'web'
    ? `${host}/.well-known/oauth-client-web.json`
    : `${host}/.well-known/oauth-client.json`;

export const OAUTH_REDIRECT_URI =
  Platform.OS === 'web'
    ? `${host}/oauth/callback`
    : `${nativeScheme}:/oauth/callback`;

/* ------------------------------------------------------------------ */
/* Scope catalog (re-exported with strict TS types)                   */
/* ------------------------------------------------------------------ */

export type RepoAction = 'create' | 'update' | 'delete';

export type OAuthFlatScope = {
  id: string;
  /** Optional list of literal scope tokens this row maps to. When
   *  omitted the scope token is just `id`. Used to group large families
   *  of `rpc:*` per-procedure scopes under one picker row. */
  tokens?: string[];
  required: boolean;
  defaultEnabled: boolean;
  labelKey: string;
  descriptionKey: string;
};

export type OAuthRepoScope = {
  collection: string;
  actions: RepoAction[];
  defaultActions: RepoAction[];
  /** Subset of `actions` that the picker can't unset — without these
   *  the app's core flows (posting, liking, following, blocking) are
   *  broken in ways that would just confuse users. */
  requiredActions?: RepoAction[];
  labelKey: string;
  descriptionKey: string;
};

export const OAUTH_FLAT_SCOPES = flatScopesData as readonly OAuthFlatScope[];
export const OAUTH_REPO_SCOPES = repoScopesData as readonly OAuthRepoScope[];

export type ScopeSelection = {
  flat: Record<string, boolean>;
  repo: Record<string, Partial<Record<RepoAction, boolean>>>;
};

/**
 * Picker selection → space-delimited scope string. Required flat scopes
 * and `requiredActions` on repo scopes are forced on regardless of the
 * incoming `selection`, so a user can't accidentally drop the mandatory
 * `atproto` token or break core posting/liking/following.
 */
export function buildSelectedScopeString(selection: ScopeSelection): string {
  const tokens: string[] = [];
  for (const flat of OAUTH_FLAT_SCOPES) {
    if (flat.required || selection.flat[flat.id]) {
      if (flat.tokens) tokens.push(...flat.tokens);
      else tokens.push(flat.id);
    }
  }
  for (const repo of OAUTH_REPO_SCOPES) {
    const actionState = selection.repo[repo.collection] ?? {};
    const requiredActions = repo.requiredActions ?? [];
    for (const action of repo.actions) {
      if (requiredActions.includes(action) || actionState[action]) {
        tokens.push(`repo:${repo.collection}?action=${action}`);
      }
    }
  }
  return tokens.join(' ');
}

export function defaultScopeSelection(): ScopeSelection {
  const flat: Record<string, boolean> = {};
  for (const f of OAUTH_FLAT_SCOPES) flat[f.id] = f.defaultEnabled;
  const repo: Record<string, Partial<Record<RepoAction, boolean>>> = {};
  for (const r of OAUTH_REPO_SCOPES) {
    repo[r.collection] = Object.fromEntries(
      r.actions.map((a) => [a, r.defaultActions.includes(a)]),
    ) as Partial<Record<RepoAction, boolean>>;
  }
  return { flat, repo };
}

/** Default scope string when no picker is used (legacy entry points). */
export const OAUTH_SCOPE = buildSelectedScopeString(defaultScopeSelection());

/** Full registered scope string — must match what the hosted metadata
 *  declares. Sync script generates the same value at deploy time. */
export const OAUTH_FULL_SCOPE = buildFullScopeString();
