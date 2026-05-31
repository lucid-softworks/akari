/**
 * Mastodon profile read/write helpers used by the onboarding screen.
 *
 * `update_credentials` is the only Mastodon write that needs multipart
 * form-data (because of avatar/header file uploads); everything else we
 * touch is JSON. We send only the fields the form actually wrote — partial
 * updates are the documented behaviour, and forwarding empty strings would
 * blank out fields the user didn't intend to clear.
 */

import type { MastodonCredentialAccount } from './token';

/**
 * Default-placeholder avatar / header URLs on Mastodon and its forks all
 * end in `missing.png`. The convention is shared across Pleroma, Akkoma,
 * and GoToSocial — they each ship their own assets under that filename to
 * stay drop-in compatible with Mastodon-aware clients.
 */
const DEFAULT_AVATAR_HEADER_SUFFIX = 'missing.png';

function isDefaultAsset(url: string | undefined): boolean {
  if (!url) return true;
  return url.endsWith(DEFAULT_AVATAR_HEADER_SUFFIX);
}

function hasBioText(account: MastodonCredentialAccount): boolean {
  // Prefer the raw `source.note` when present — it's what the user actually
  // typed. Falls back to the HTML-rendered `note` (stripped) for older
  // servers / generic Mastodon-compatible profiles that don't return source.
  const raw = account.source?.note;
  if (typeof raw === 'string' && raw.trim().length > 0) return true;
  return account.note.replace(/<[^>]+>/g, '').trim().length > 0;
}

function hasDisplayName(account: MastodonCredentialAccount): boolean {
  const dn = account.display_name?.trim() ?? '';
  if (!dn) return false;
  // Many servers default `display_name` to the local username; that's not
  // a "set" display name, just an absent one — treat it as incomplete so
  // the onboarding screen invites the user to choose something.
  return dn !== account.username;
}

/**
 * Heuristic for "this Mastodon profile looks like the signup defaults".
 * Mastodon enforces no required fields at signup, so we can't ask the
 * server; we infer from the placeholder URLs + empty strings instead.
 *
 * Conservative: any one of {missing avatar, missing header, empty display
 * name, empty bio} flips it to incomplete. `discoverable` is handled as a
 * choice on the form (its API default is false / null) rather than a
 * trigger, since opt-out is a legitimate end state.
 */
export function isMastodonProfileIncomplete(account: MastodonCredentialAccount): boolean {
  if (isDefaultAsset(account.avatar)) return true;
  if (isDefaultAsset(account.header)) return true;
  if (!hasDisplayName(account)) return true;
  if (!hasBioText(account)) return true;
  return false;
}

/**
 * Local-file reference for an avatar / header upload. `uri` is whatever
 * expo-image-picker (or the web `<input type="file">`) handed us; `name`
 * + `type` round out the multipart part so the server can dispatch on
 * MIME.
 */
export type MastodonProfileImage = {
  uri: string;
  name: string;
  /** MIME type — `image/jpeg`, `image/png`, etc. */
  type: string;
};

export type UpdateMastodonProfileInput = {
  instanceUrl: string;
  accessToken: string;
  displayName?: string;
  /** Raw bio text — Mastodon converts to HTML server-side. */
  note?: string;
  discoverable?: boolean;
  /** Mastodon 4.2+; older servers silently ignore the field. */
  indexable?: boolean;
  avatar?: MastodonProfileImage;
  header?: MastodonProfileImage;
};

/**
 * `PATCH /api/v1/accounts/update_credentials` (multipart). Returns the
 * updated `CredentialAccount` so the caller can write it through to
 * react-query without an extra round-trip.
 */
export async function updateMastodonProfile(
  input: UpdateMastodonProfileInput,
): Promise<MastodonCredentialAccount> {
  const form = new FormData();
  if (input.displayName !== undefined) form.append('display_name', input.displayName);
  if (input.note !== undefined) form.append('note', input.note);
  if (input.discoverable !== undefined) form.append('discoverable', String(input.discoverable));
  if (input.indexable !== undefined) form.append('indexable', String(input.indexable));
  if (input.avatar) {
    // React Native's FormData accepts the `{ uri, name, type }` shape directly;
    // on web `fetch`'s built-in FormData expects a `Blob` / `File`. The
    // picker code converts the picked asset to whichever the platform needs
    // before calling this — here we just trust the shape.
    form.append('avatar', input.avatar as unknown as Blob);
  }
  if (input.header) {
    form.append('header', input.header as unknown as Blob);
  }

  const res = await fetch(`${input.instanceUrl}/api/v1/accounts/update_credentials`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/json',
      // Deliberately NOT setting Content-Type — `fetch` infers
      // `multipart/form-data; boundary=…` from the FormData body.
    },
    body: form,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    if (json?.error) detail = json.error;
    throw new Error(`Updating your Mastodon profile failed: ${detail}`);
  }

  const json = (await res.json().catch(() => null)) as MastodonCredentialAccount | null;
  if (!json?.id) {
    throw new Error('Mastodon returned an incomplete profile after update.');
  }
  return json;
}
